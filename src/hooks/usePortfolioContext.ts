import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Post, TravelLocation, GalleryImage } from '@/types';

interface PortfolioContext {
  posts: Pick<Post, 'title' | 'description'>[];
  locations: Pick<TravelLocation, 'title' | 'name' | 'description'>[];
  images: Pick<GalleryImage, 'alt_text' | 'tags'>[];
}

export const usePortfolioContext = () => {
  const [context, setContext] = useState<PortfolioContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [postsRes, locationsRes] = await Promise.all([
          supabase.from('posts').select('title, description').eq('published', true).order('published_at', { ascending: false }).limit(10),
          supabase.from('travel_locations').select('title, name, description').order('created_at', { ascending: false }).limit(10),
        ]);

        if (postsRes.error) throw new Error(`Posts: ${postsRes.error.message}`);
        if (locationsRes.error) throw new Error(`Locations: ${locationsRes.error.message}`);

        const IMAGE_LIMIT = 20;
        let images: Pick<GalleryImage, 'alt_text' | 'tags'>[] = [];

        // First, try to fetch images with no tags (tags is null or an empty array)
        const { data: untaggedImages, error: untaggedError } = await supabase
          .from('gallery_images')
          .select('alt_text, tags')
          .or('tags is null,tags.eq.{}') // Check for NULL or empty array
          .neq('alt_text', '') // Still exclude empty alt_text
          .limit(IMAGE_LIMIT);

        if (untaggedError) throw new Error(`Untagged Images: ${untaggedError.message}`);

        images = untaggedImages || [];

        // If we don't have enough images, fetch some with tags to meet the limit
        if (images.length < IMAGE_LIMIT) {
          const remainingLimit = IMAGE_LIMIT - images.length;
          const { data: taggedImages, error: taggedError } = await supabase
            .from('gallery_images')
            .select('alt_text, tags')
            .not('tags', 'is', null) // Exclude null tags
            .not('tags', 'eq', '{}') // Exclude empty array tags
            .neq('alt_text', '') // Still exclude empty alt_text
            .limit(remainingLimit);

          if (taggedError) throw new Error(`Tagged Images: ${taggedError.message}`);
          images = [...images, ...(taggedImages || [])];
        }

        setContext({
          posts: postsRes.data || [],
          locations: locationsRes.data || [],
          images: images,
        });
      } catch (err: any) {
        setError(err.message);
        console.error("Failed to fetch portfolio context:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, []);

  return { context, loading, error };
};