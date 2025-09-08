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

        // First, fetch images where tags is null
        const { data: nullTagsImages, error: nullTagsError } = await supabase
          .from('gallery_images')
          .select('alt_text, tags')
          .is('tags', null)
          .neq('alt_text', '')
          .limit(IMAGE_LIMIT);

        if (nullTagsError) throw new Error(`Null Tags Images: ${nullTagsError.message}`);
        images = nullTagsImages || [];

        // If we still need more images, fetch where tags is an empty array
        if (images.length < IMAGE_LIMIT) {
          const remainingLimit = IMAGE_LIMIT - images.length;
          const { data: emptyTagsImages, error: emptyTagsError } = await supabase
            .from('gallery_images')
            .select('alt_text, tags')
            .eq('tags', '{}') // Correct way to check for empty array
            .neq('alt_text', '')
            .limit(remainingLimit);

          if (emptyTagsError) throw new Error(`Empty Tags Images: ${emptyTagsError.message}`);
          images = [...images, ...(emptyTagsImages || [])];
        }

        // Finally, if we still don't have enough, fetch some with actual tags
        if (images.length < IMAGE_LIMIT) {
          const remainingLimit = IMAGE_LIMIT - images.length;
          const { data: taggedImages, error: taggedError } = await supabase
            .from('gallery_images')
            .select('alt_text, tags')
            .not('tags', 'is', null) // Exclude null tags
            .not('tags', 'eq', '{}') // Exclude empty array tags
            .neq('alt_text', '')
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