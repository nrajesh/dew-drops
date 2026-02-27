import useSWR from "swr";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";

const GALLERY_KEY = "gallery_images:published";

const fetchPublishedImages = async (): Promise<GalleryImage[]> => {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as GalleryImage[];
};

/**
 * SWR-backed hook for the public gallery image list.
 *
 * - Deduplication: a second component mounting within 60 s reuses the in-flight
 *   or already-resolved request; no duplicate network calls.
 * - keepPreviousData: navigating away and back shows the cached list instantly
 *   while a background revalidation runs — no blank/loading flash.
 * - revalidateOnFocus: disabled — the gallery rarely changes; avoids spurious
 *   refetches when the user switches tabs.
 *
 * `mutate()` is exposed so callers (e.g. after a lightbox deletion) can
 * immediately invalidate and refresh.
 */
export const useGalleryImages = () => {
  const { data, error, isLoading, mutate } = useSWR<GalleryImage[]>(
    GALLERY_KEY,
    fetchPublishedImages,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000, // 60 s — one refetch per minute max
      keepPreviousData: true, // instant display on back-navigation
      errorRetryCount: 2,
    },
  );

  return {
    images: data ?? [],
    isLoading,
    error,
    mutate,
  };
};
