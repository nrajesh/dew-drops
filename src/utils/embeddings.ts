import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";

/**
 * Searches gallery images using Supabase Full-Text Search (FTS) on metadata fields.
 * If the search term is provided, it uses the RPC function for robust server-side search.
 * If the RPC fails or no search term is provided, it returns the original list (though the calling component handles the no-search-term case).
 * 
 * @param searchTerm The text query to search for.
 * @param allImages The full list of images (used as a fallback if RPC fails).
 * @returns A promise resolving to the filtered/searched list of images.
 */
export const searchImagesByMetadata = async (
  searchTerm: string,
  allImages: GalleryImage[]
): Promise<GalleryImage[]> => {
  if (!searchTerm || searchTerm.trim() === "") {
    return allImages;
  }

  try {
    // Use Supabase RPC for Full-Text Search (FTS)
    const { data, error } = await supabase.rpc('search_gallery_images', {
      query: searchTerm.trim(),
    });

    if (error) {
      console.error("Supabase RPC search failed, falling back to client-side filter:", error);
      // Fallback to simple client-side filtering if RPC fails
      return allImages.filter(image => {
        const searchString = [
          image.alt_text,
          image.file_name,
          image.tags ? image.tags.join(' ') : '',
          // Include EXIF data if available and searchable
          image.exif_data ? JSON.stringify(image.exif_data) : '',
        ].join(' ').toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
      });
    }

    // The RPC returns the matching GalleryImage objects
    return data as GalleryImage[];

  } catch (e) {
    console.error("Unexpected error during image search:", e);
    return allImages;
  }
};