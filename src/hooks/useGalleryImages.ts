import { useMemo } from "react";
import { localDataProvider } from "@/lib/LocalDataProvider";
import type { GalleryImage } from "@/types";

/**
 * Hook for the public gallery image list, backed by local data.
 *
 * - Data is loaded once from `localDataProvider.getGalleryImages()`.
 * - Images are sorted by `created_at` in descending order.
 * - `featuredImages` are the first 10 published images.
 * - `publishedImages` are all published images.
 * - `isLoading` is always `false` as data is synchronously available.
 */
export const useGalleryImages = () => {
  const allImages = useMemo(() => {
    const data = localDataProvider.getGalleryImages();
    return [...data].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );
  }, []);

  const featuredImages = useMemo(() => {
    return allImages.filter((img) => img.published).slice(0, 10);
  }, [allImages]);

  const publishedImages = useMemo(() => {
    return allImages.filter((img) => img.published);
  }, [allImages]);

  return {
    allImages,
    featuredImages,
    publishedImages,
    isLoading: false,
    mutate: () => {}, // Mock mutate for compatibility
  };
};

export type { GalleryImage };
