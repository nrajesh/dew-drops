import posts from "../data/posts.json";
import profiles from "../data/profiles.json";
import travelLocations from "../data/travel_locations.json";
import galleryImages from "../data/gallery_images.json";
import featureToggles from "../data/feature_toggles.json";
import chatbotKnowledge from "../data/chatbot_knowledge.json";
import { Post, Profile, TravelLocation, GalleryImage } from "@/types";
import { getStoredChatbotKnowledgeContent } from "@/lib/chatbotKnowledgeStorage";
import { getStoredLocalDataBundleTabular } from "@/lib/localDataBundleStorage";

/** Bundled JSON can contain many rows; models only ever saw `rows[0]` before. */
const MAX_BUNDLED_CHATBOT_CONTEXT_CHARS = 200_000;

function mergeBundledChatbotRows(rows: { content?: string }[]): string {
  const pieces = rows
    .map((r) => (typeof r.content === "string" ? r.content.trim() : ""))
    .filter((c) => c.length > 0);
  if (pieces.length === 0) return "";

  const priority = (text: string) =>
    /PORTFOLIO KNOWLEDGE BASE/i.test(text) ||
    /PORTFOLIO SHOWCASE/i.test(text) ||
    /==\s*RESUME/i.test(text) ||
    /RESUME DATA/i.test(text)
      ? 1
      : 0;

  pieces.sort((a, b) => priority(b) - priority(a));

  let merged = pieces.join("\n\n---\n\n");
  if (merged.length > MAX_BUNDLED_CHATBOT_CONTEXT_CHARS) {
    merged =
      merged.slice(0, MAX_BUNDLED_CHATBOT_CONTEXT_CHARS) +
      "\n\n[Note: Some bundled knowledge entries were omitted due to length. Use Manage Chatbot to curate a shorter, focused knowledge base.]";
  }
  return merged;
}

class LocalDataProvider {
  private getBundle() {
    return getStoredLocalDataBundleTabular();
  }

  private transformImageUrl(url: string | null): string {
    if (!url) return "";
    // If it's already a relative path or an external URL we want to keep, return it
    if (url.startsWith("/") || url.startsWith("http")) {
      // Compatibility for old Supabase URLs that might still be in data
      if (url.includes("supabase.co/storage/v1/object/public/gallery/")) {
        const parts = url.split("/public/gallery/");
        if (parts.length > 1) {
          const path = parts[1].replace(/\//g, "_");
          return `/uploads/${path}`;
        }
      }
      return url;
    }
    return url;
  }

  getPosts(): Post[] {
    const bundle = this.getBundle();
    if (bundle) {
      return bundle.posts.map((post) => ({ ...post }));
    }
    return (posts as Post[]).map((post) => ({
      ...post,
      // If there's a cover image URL in the future, transform it here
    }));
  }

  getProfiles(): Profile[] {
    const bundle = this.getBundle();
    if (bundle) return bundle.profiles.map((p) => ({ ...p }));
    return profiles as Profile[];
  }

  getTravelLocations(): TravelLocation[] {
    const bundle = this.getBundle();
    const source = bundle
      ? bundle.travel_locations
      : (travelLocations as TravelLocation[]);
    return source.map((loc) => ({
      ...loc,
      marker_image_url: this.transformImageUrl(loc.marker_image_url),
    }));
  }

  getGalleryImages(): GalleryImage[] {
    const bundle = this.getBundle();
    const source = bundle ? bundle.gallery_images : (galleryImages as GalleryImage[]);
    return source.map((img) => ({
      ...img,
      image_url: this.transformImageUrl(img.image_url),
      file_name: img.file_name.replace(/\//g, "_"),
    }));
  }

  getFeatureToggles(): Record<string, unknown>[] {
    const bundle = this.getBundle();
    if (bundle) return bundle.feature_toggles.map((t) => ({ ...t }));
    return featureToggles as Record<string, unknown>[];
  }

  getChatbotKnowledge(): { content: string }[] {
    const stored = getStoredChatbotKnowledgeContent();
    if (stored !== null) {
      return [{ content: stored }];
    }
    const rows = chatbotKnowledge as { content?: string }[];
    const merged = mergeBundledChatbotRows(rows);
    if (!merged) return [];
    return [{ content: merged }];
  }

  getGalleryImageById(id: string | null): GalleryImage | null {
    if (!id) return null;
    const images = this.getGalleryImages();
    return images.find((img) => img.id === id) || null;
  }
}

export const localDataProvider = new LocalDataProvider();
