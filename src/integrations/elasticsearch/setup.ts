import elasticsearchClient from './client';
import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

export const setupElasticsearchIndex = async () => {
  try {
    // Check if the index exists
    const indexExists = await elasticsearchClient.indices.exists({ index: 'gallery_images' });

    if (!indexExists) {
      // Create the index with vector mapping
      const createRequest: IndicesCreateRequest = {
        index: 'gallery_images',
        body: {
          mappings: {
            properties: {
              image_id: { type: 'keyword' },
              image_url: { type: 'text' },
              alt_text: { type: 'text' },
              file_name: { type: 'text' },
              user_id: { type: 'keyword' },
              embedding: {
                type: 'dense_vector',
                dims: 512, // Dimension of our embeddings
                index: true,
                similarity: 'cosine' // Use cosine similarity for vector search
              },
              created_at: { type: 'date' }
            }
          }
        }
      };

      await elasticsearchClient.indices.create(createRequest);
      console.log('Elasticsearch index created successfully');
    } else {
      console.log('Elasticsearch index already exists');
    }
  } catch (error) {
    console.error('Error setting up Elasticsearch index:', error);
    throw error;
  }
};