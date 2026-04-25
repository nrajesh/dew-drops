import type { GalleryImage, Post, Profile, TravelLocation } from "@/types";
import type { LocalDataBundleTabular } from "@/lib/localDataBundleStorage";
import { localDataProvider } from "@/lib/LocalDataProvider";
import {
  portfolioShowcaseSchema,
  type PortfolioShowcaseData,
} from "@/types/portfolioShowcase";

export const TABULAR_BUNDLE_KEYS = [
  "posts",
  "profiles",
  "travel_locations",
  "gallery_images",
  "feature_toggles",
] as const;

export type TabularBundleKey = (typeof TABULAR_BUNDLE_KEYS)[number];

export const DATA_SECTION_KEYS = [
  ...TABULAR_BUNDLE_KEYS,
  "chatbot_knowledge",
  "portfolio_showcase",
] as const;

export type DataSectionKey = (typeof DATA_SECTION_KEYS)[number];

export const SECTION_LABELS: Record<DataSectionKey, string> = {
  posts: "Blog posts",
  profiles: "Profiles",
  travel_locations: "Travel locations",
  gallery_images: "Gallery images",
  feature_toggles: "Feature toggles",
  chatbot_knowledge: "Chatbot knowledge",
  portfolio_showcase: "Portfolio showcase",
};

export type ImportSelection = Record<DataSectionKey, boolean>;

export function defaultImportSelectionAll(): ImportSelection {
  return Object.fromEntries(
    DATA_SECTION_KEYS.map((k) => [k, true]),
  ) as ImportSelection;
}

export function selectionFromKeysInFile(keys: DataSectionKey[]): ImportSelection {
  return Object.fromEntries(
    DATA_SECTION_KEYS.map((k) => [k, keys.includes(k)]),
  ) as ImportSelection;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export type ParsedImportFile = {
  tabularPatches: Partial<{
    posts: Post[];
    profiles: Profile[];
    travel_locations: TravelLocation[];
    gallery_images: GalleryImage[];
    feature_toggles: Record<string, unknown>[];
  }>;
  /** `undefined` = property absent from JSON (do not change on import). */
  portfolioShowcase: PortfolioShowcaseData | undefined;
  /** `absent` = key missing; `empty` = []; else merged text from rows. */
  chatbotInFile: "absent" | "empty" | { merged: string };
};

export function getEffectiveTabularSnapshot(): LocalDataBundleTabular {
  return {
    posts: localDataProvider.getPosts(),
    profiles: localDataProvider.getProfiles(),
    travel_locations: localDataProvider.getTravelLocations(),
    gallery_images: localDataProvider.getGalleryImages(),
    feature_toggles: localDataProvider.getFeatureToggles(),
  };
}

export function buildMergedTabular(
  base: LocalDataBundleTabular,
  patches: ParsedImportFile["tabularPatches"],
  selection: ImportSelection,
): LocalDataBundleTabular {
  const merged: LocalDataBundleTabular = {
    posts: [...base.posts],
    profiles: [...base.profiles],
    travel_locations: [...base.travel_locations],
    gallery_images: [...base.gallery_images],
    feature_toggles: base.feature_toggles.map((t) => ({ ...t })),
  };
  for (const key of TABULAR_BUNDLE_KEYS) {
    const patch = patches[key];
    if (selection[key] && patch) {
      merged[key] = patch as LocalDataBundleTabular[typeof key];
    }
  }
  return merged;
}

/** Keys that appear in the parsed file and can be toggled for import. */
export function keysPresentInImport(data: ParsedImportFile): DataSectionKey[] {
  const keys: DataSectionKey[] = [];
  for (const k of TABULAR_BUNDLE_KEYS) {
    if (data.tabularPatches[k]) keys.push(k);
  }
  if (data.portfolioShowcase !== undefined) keys.push("portfolio_showcase");
  if (data.chatbotInFile !== "absent") keys.push("chatbot_knowledge");
  return keys;
}

export function parseImportFile(
  parsed: unknown,
): { ok: true; data: ParsedImportFile } | { ok: false; message: string } {
  if (!isRecord(parsed)) {
    return { ok: false, message: "File must contain a JSON object." };
  }

  const tabularPatches = {} as ParsedImportFile["tabularPatches"];

  for (const key of TABULAR_BUNDLE_KEYS) {
    if (!(key in parsed)) continue;
    const v = parsed[key];
    if (!Array.isArray(v)) {
      return {
        ok: false,
        message: `"${key}" must be an array when present.`,
      };
    }
    switch (key) {
      case "posts":
        tabularPatches.posts = v as Post[];
        break;
      case "profiles":
        tabularPatches.profiles = v as Profile[];
        break;
      case "travel_locations":
        tabularPatches.travel_locations = v as TravelLocation[];
        break;
      case "gallery_images":
        tabularPatches.gallery_images = v as GalleryImage[];
        break;
      case "feature_toggles":
        tabularPatches.feature_toggles = v as Record<string, unknown>[];
        break;
      default:
        break;
    }
  }

  let portfolioShowcase: PortfolioShowcaseData | undefined;
  if ("portfolio_showcase" in parsed && parsed.portfolio_showcase !== undefined) {
    const pr = portfolioShowcaseSchema.safeParse(parsed.portfolio_showcase);
    if (!pr.success) {
      return {
        ok: false,
        message: "Invalid portfolio_showcase: does not match the expected schema.",
      };
    }
    portfolioShowcase = pr.data;
  }

  let chatbotInFile: ParsedImportFile["chatbotInFile"] = "absent";
  if ("chatbot_knowledge" in parsed) {
    const ck = parsed.chatbot_knowledge;
    if (!Array.isArray(ck)) {
      return { ok: false, message: "chatbot_knowledge must be an array when present." };
    }
    if (ck.length === 0) {
      chatbotInFile = "empty";
    } else {
      const pieces = ck
        .map((row) =>
          isRecord(row) && typeof row.content === "string" ? row.content.trim() : "",
        )
        .filter((s) => s.length > 0);
      chatbotInFile =
        pieces.length > 0 ? { merged: pieces.join("\n\n---\n\n") } : "empty";
    }
  }

  const hasTabular = TABULAR_BUNDLE_KEYS.some(
    (k) => tabularPatches[k] !== undefined,
  );
  const hasPortfolio = portfolioShowcase !== undefined;
  const hasChatbot = chatbotInFile !== "absent";

  if (!hasTabular && !hasPortfolio && !hasChatbot) {
    return {
      ok: false,
      message:
        "No importable sections found. Include at least one of: posts, profiles, travel_locations, gallery_images, feature_toggles, chatbot_knowledge, portfolio_showcase.",
    };
  }

  return {
    ok: true,
    data: { tabularPatches, portfolioShowcase, chatbotInFile },
  };
}

export function validateImportSelection(
  selection: ImportSelection,
  data: ParsedImportFile,
): string | null {
  const anySelected = DATA_SECTION_KEYS.some((k) => selection[k]);
  if (!anySelected) return "Select at least one section to import.";

  for (const k of TABULAR_BUNDLE_KEYS) {
    if (selection[k] && !data.tabularPatches[k]) {
      return `This file has no "${k}" section; uncheck ${SECTION_LABELS[k]} or use a different file.`;
    }
  }
  if (selection.portfolio_showcase && data.portfolioShowcase === undefined) {
    return "This file has no portfolio_showcase; uncheck Portfolio showcase or use a different file.";
  }
  if (selection.chatbot_knowledge && data.chatbotInFile === "absent") {
    return "This file has no chatbot_knowledge; uncheck Chatbot knowledge or use a different file.";
  }
  return null;
}

export type DewDropsExportPayload = {
  exportVersion: 2;
  exportedAt: string;
  /** Which top-level keys are included (for clarity). */
  includedSections: DataSectionKey[];
} & Partial<{
  posts: Post[];
  profiles: Profile[];
  travel_locations: TravelLocation[];
  gallery_images: GalleryImage[];
  feature_toggles: Record<string, unknown>[];
  chatbot_knowledge: { content: string }[];
  portfolio_showcase: PortfolioShowcaseData;
}>;
