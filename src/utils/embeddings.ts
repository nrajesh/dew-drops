import { supabase } from '@/integrations/supabase/client';
import { GalleryImage } from '@/types';
import { FunctionsHttpError } from '@supabase/supabase-js';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const generateEmbedding = async (imageUrl: string, retryCount = 0): Promise<number[]> => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-image-embedding', {
      body: { imageUrl },
    });

    if (error) {
      if (error instanceof FunctionsHttpError) {
        const isRateLimit = error.context.status === 429;
        if (isRateLimit && retryCount < 3) {
          const retryAfter = Math.pow(2, retryCount) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          return generateEmbedding(imageUrl, retryCount + 1);
        }
        const errorData = await error.context.json().catch(() => ({ error: 'Unknown function error' }));
        throw new Error(`Failed to generate embedding: ${errorData.error || error.message}`);
      }
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }

    if (data?.embedding && Array.isArray(data.embedding)) {
      return data.embedding;
    } else {
      throw new Error("Unexpected response format from embedding function.");
    }
  } catch (error: any) {
    console.error("Error generating embedding:", error);
    throw error;
  }
};

export const searchSimilarImages = async (queryEmbedding: number[], limit: number = 10): Promise<GalleryImage[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('search-gallery-images', {
      body: {
        queryEmbedding,
        matchCount: limit
      }
    });

    if (error) {
      if (error instanceof FunctionsHttpError) {
        const errorData = await error.context.json().catch(() => ({ error: 'Unknown function error' }));
        throw new Error(`Failed to search images: ${errorData.error || error.message}`);
      }
      throw new Error(`Failed to search images: ${error.message}`);
    }

    return data.results || [];
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

export const generateSearchEmbedding = async (searchTerm: string): Promise<number[]> => {
  const embedding = new Array(512).fill(0);
  for (let i = 0; i < searchTerm.length; i++) {
    const charCode = searchTerm.charCodeAt(i);
    const index = charCode % 512;
    embedding[index] = (embedding[index] + charCode) / 2;
  }
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return embedding;
  return embedding.map(val => val / magnitude);
};

export const searchImagesByMetadata = async (searchTerm: string, images: GalleryImage[]): Promise<GalleryImage[]> => {
  const lowerSearchTerm = searchTerm.toLowerCase();
  const searchTerms = lowerSearchTerm.split(/\s+/).filter(term => term.length > 0);

  return images.filter(image => {
    const filenameMatch = searchTerms.some(term =>
      image.file_name.toLowerCase().includes(term)
    );
    const altTextMatch = image.alt_text?.toLowerCase().includes(lowerSearchTerm) || false;
    let exifMatch = false;
    if (image.exif_data) {
      for (const value of Object.values(image.exif_data)) {
        if (String(value).toLowerCase().includes(lowerSearchTerm)) {
          exifMatch = true;
          break;
        }
      }
    }
    return filenameMatch || altTextMatch || exifMatch;
  });
};