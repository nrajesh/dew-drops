import posts from "../data/posts.json";
import profiles from "../data/profiles.json";
import travelLocations from "../data/travel_locations.json";
import galleryImages from "../data/gallery_images.json";
import featureToggles from "../data/feature_toggles.json";
import chatbotKnowledge from "../data/chatbot_knowledge.json";
import { Post, Profile, TravelLocation, GalleryImage } from "@/types";

class LocalDataProvider {
  private transformImageUrl(url: string | null): string {
    if (!url) return "";
    // If it's already a relative path or an external URL we want to keep, return it
    if (url.startsWith('/') || url.startsWith('http')) {
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
    return (posts as Post[]).map((post) => ({
      ...post,
      // If there's a cover image URL in the future, transform it here
    }));
  }

  getProfiles(): Profile[] {
    return profiles as Profile[];
  }

  getTravelLocations(): TravelLocation[] {
    return (travelLocations as TravelLocation[]).map((loc) => ({
      ...loc,
      marker_image_url: this.transformImageUrl(loc.marker_image_url),
    }));
  }

  getGalleryImages(): GalleryImage[] {
    return (galleryImages as GalleryImage[]).map((img) => ({
      ...img,
      image_url: this.transformImageUrl(img.image_url),
      file_name: img.file_name.replace(/\//g, "_"),
    }));
  }

  getFeatureToggles(): Record<string, unknown>[] {
    return featureToggles as Record<string, unknown>[];
  }

  getChatbotKnowledge(): { content: string }[] {
    return chatbotKnowledge as { content: string }[];
  }

  getGalleryImageById(id: string | null): GalleryImage | null {
    if (!id) return null;
    const images = this.getGalleryImages();
    return images.find((img) => img.id === id) || null;
  }
}

export const localDataProvider = new LocalDataProvider();
