import { supabase } from '@/integrations/supabase/client';
import { GalleryImage } from '@/types';

export const generateEmbedding = async (imageUrl: string): Promise<number[]> => {
  const embedding: number[] = [];
  for (let i = 0; i < 512; i++) {
    embedding.push(Math.random() * 2 - 1);
  }
  return embedding;
};

export const searchSimilarImages = async (queryEmbedding: number[], limit: number = 10): Promise<GalleryImage[]> => {
  try {
    console.log('Searching with embedding:', queryEmbedding.slice(0, 5), '...');

    const { data, error } = await supabase.functions.invoke('image-search', {
      body: { queryEmbedding, limit },
    });

    if (error) {
      const errorBody = await error.context.json();
      throw new Error(errorBody.error || error.message);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    console.log('Search results:', data);
    return data as GalleryImage[];
  } catch (error) {
    console.error('Error searching similar images:', error);
    throw error;
  }
};