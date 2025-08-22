import { supabase } from '@/integrations/supabase/client';
import { GalleryImage } from '@/types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const generateEmbedding = async (imageUrl: string, retryCount = 0): Promise<number[]> => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  try {
    const response = await fetch('https://dasjvafuudjotbaoawrj.supabase.co/functions/v1/generate-image-embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
      },
      body: JSON.stringify({ imageUrl })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429 && retryCount < 3) {
        // Handle rate limiting with exponential backoff
        const retryAfter = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return generateEmbedding(imageUrl, retryCount + 1);
      }
      throw new Error(`Failed to generate embedding: ${response.statusText}${errorData.error ? ` - ${errorData.error}` : ''}`);
    }

    const data = await response.json();

    // Handle different response formats
    if (Array.isArray(data)) {
      // Direct array response
      return data;
    } else if (data.embedding && Array.isArray(data.embedding)) {
      // Object with embedding property
      return data.embedding;
    } else {
      throw new Error("Unexpected response format - expected an array or object with 'embedding' property");
    }
  } catch (error: any) {
    console.error("Error generating embedding:", error);
    if (error.message.includes('429') && retryCount < 3) {
      // If it's a rate limit error and we haven't retried too many times
      const retryAfter = Math.pow(2, retryCount) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      return generateEmbedding(imageUrl, retryCount + 1);
    }
    throw error;
  }
};

export const searchSimilarImages = async (queryEmbedding: number[], limit: number = 10): Promise<GalleryImage[]> => {
  try {
    const response = await fetch('https://dasjvafuudjotbaoawrj.supabase.co/functions/v1/search-gallery-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
      },
      body: JSON.stringify({
        queryEmbedding,
        matchCount: limit
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to search images: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error searching images:", error);
    throw error;
  }
};

export const updateImageEmbedding = async (imageId: string, embedding: number[]): Promise<void> => {
  const { error } = await supabase
    .from('gallery_images')
    .update({ embedding })
    .eq('id', imageId);

  if (error) {
    throw new Error(`Failed to update embedding: ${error.message}`);
  }
};