import { supabase } from '@/integrations/supabase/client';
import elasticsearchClient from '@/integrations/elasticsearch/client';
import { GalleryImage } from '@/types';

export const generateEmbedding = async (imageUrl: string): Promise<number[]> => {
  // In a real implementation, this would call an image embedding service
  // For this example, we'll simulate generating a random embedding
  // In practice, you would use a service like CLIP or other image embedding models

  // Simulate generating a 512-dimensional embedding
  const embedding: number[] = [];
  for (let i = 0; i < 512; i++) {
    embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
  }

  return embedding;
};

export const storeEmbedding = async (image: GalleryImage, embedding: number[]) => {
  try {
    await elasticsearchClient.index({
      index: 'gallery_images',
      id: image.id,
      body: {
        image_id: image.id,
        image_url: image.image_url,
        alt_text: image.alt_text,
        file_name: image.file_name,
        user_id: image.user_id,
        embedding: embedding,
        created_at: image.created_at
      }
    });
  } catch (error) {
    console.error('Error storing embedding:', error);
    throw error;
  }
};

export const searchSimilarImages = async (queryEmbedding: number[], limit: number = 10): Promise<GalleryImage[]> => {
  try {
    const response = await elasticsearchClient.search({
      index: 'gallery_images',
      body: {
        size: limit,
        query: {
          script_score: {
            query: { match_all: {} },
            script: {
              source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
              params: { query_vector: queryEmbedding }
            }
          }
        }
      }
    });

    return response.hits.hits.map(hit => ({
      id: hit._source.image_id,
      image_url: hit._source.image_url,
      alt_text: hit._source.alt_text,
      file_name: hit._source.file_name,
      user_id: hit._source.user_id,
      created_at: hit._source.created_at,
      exif_data: null // We don't store EXIF data in Elasticsearch
    }));
  } catch (error) {
    console.error('Error searching similar images:', error);
    throw error;
  }
};