import type { GalleryImage, Post, Profile, TravelLocation } from "@/types";

export const LOCAL_DATA_BUNDLE_STORAGE_KEY = "dew-drops-local-data-bundle";

export const LOCAL_DATA_BUNDLE_UPDATED_EVENT =
  "dew-drops-local-data-bundle-updated";

export type LocalDataBundleTabular = {
  posts: Post[];
  profiles: Profile[];
  travel_locations: TravelLocation[];
  gallery_images: GalleryImage[];
  feature_toggles: Record<string, unknown>[];
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function parseLocalDataBundleTabular(
  parsed: unknown,
): LocalDataBundleTabular | null {
  if (!isRecord(parsed)) return null;
  if (!Array.isArray(parsed.posts)) return null;
  if (!Array.isArray(parsed.profiles)) return null;
  if (!Array.isArray(parsed.travel_locations)) return null;
  if (!Array.isArray(parsed.gallery_images)) return null;
  if (!Array.isArray(parsed.feature_toggles)) return null;
  return {
    posts: parsed.posts as Post[],
    profiles: parsed.profiles as Profile[],
    travel_locations: parsed.travel_locations as TravelLocation[],
    gallery_images: parsed.gallery_images as GalleryImage[],
    feature_toggles: parsed.feature_toggles as Record<string, unknown>[],
  };
}

export function getStoredLocalDataBundleTabular(): LocalDataBundleTabular | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(LOCAL_DATA_BUNDLE_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  return parseLocalDataBundleTabular(parsed);
}

/** Persists tabular overrides (posts, profiles, travel, gallery, toggles). */
export function setStoredLocalDataBundleTabular(
  data: LocalDataBundleTabular,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(
      LOCAL_DATA_BUNDLE_STORAGE_KEY,
      JSON.stringify(data),
    );
    window.dispatchEvent(new Event(LOCAL_DATA_BUNDLE_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredLocalDataBundle(): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(LOCAL_DATA_BUNDLE_STORAGE_KEY);
    window.dispatchEvent(new Event(LOCAL_DATA_BUNDLE_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}
