import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Post, TravelLocation, Video, GalleryImage } from '@/types';

interface PortfolioContext {
  posts: Pick<Post, 'title' | 'description'>[];
  locations: Pick<TravelLocation, 'title' | 'name' | 'description'>[];
  videos: Pick<Video, 'title'>[];
  images: Pick<GalleryImage, 'alt_text'>[];
}

export const usePortfolioContext = () => {
  const [context, setContext] = useState<PortfolioContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [postsRes, locationsRes, videosRes, imagesRes] = await Promise.all([
          supabase.from('posts').select('title, description').order('published_at', { ascending: false }).limit(10),
          supabase.from('travel_locations').select('title, name, description').order('created_at', { ascending: false }).limit(10),
          supabase.from('videos').select('title').order('created_at', { ascending: false }).limit(10),
          supabase.from('gallery_images').select('alt_text').neq('alt_text', '').limit(20)
        ]);

        if (postsRes.error) throw new Error(`Posts: ${postsRes.error.message}`);
        if (locationsRes.error) throw new Error(`Locations: ${locationsRes.error.message}`);
        if (videosRes.error) throw new Error(`Videos: ${videosRes.error.message}`);
        if (imagesRes.error) throw new Error(`Images: ${imagesRes.error.message}`);

        setContext({
          posts: postsRes.data || [],
          locations: locationsRes.data || [],
          videos: videosRes.data || [],
          images: imagesRes.data || [],
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