import { supabase } from '@/integrations/supabase/client';
import { GalleryImage } from '@/types';

// This function is a mock. In a real-world scenario, you would likely have
// another Edge Function that takes an image URL and returns an embedding
// from a service like CLIP or a self-hosted model.
export const generateEmbedding = async (imageUrl: string): Promise<number[]> => {
  // Simulate generating a 512-dimensional embedding
  const embedding: number[] = [];
  for (let i = 0; i < 512; i++) {
    embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
  }
  return embedding;
};

// This function now calls our secure Edge Function instead of Elasticsearch directly.
export const searchSimilarImages = async (queryEmbedding: number[], limit: number = 10): Promise<GalleryImage[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('image-search', {
      body: { queryEmbedding, limit },
    });

    if (error) {
      // The function returned a non-2xx response.
      // The error object from Supabase contains the response.
      const errorBody = await error.context.json();
      throw new Error(errorBody.error || error.message);
    }
    
    if (data.error) {
      // The function returned 2xx but with an error payload.
      throw new Error(data.error);
    }

    return data as GalleryImage[];
  } catch (error) {
    console.error('Error searching similar images:', error);
    throw error;
  }
};