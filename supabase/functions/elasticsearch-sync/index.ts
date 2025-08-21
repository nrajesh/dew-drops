import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { Client } from "npm:@elastic/elasticsearch@8.15.0";
import { createClient } from 'npm:@supabase/supabase-js@2';

// Elasticsearch and Supabase credentials from environment variables
const ELASTICSEARCH_URL = Deno.env.get('ELASTICSEARCH_URL')
const ELASTICSEARCH_API_KEY = Deno.env.get('ELASTICSEARCH_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This mock embedding generation matches the client-side implementation.
// For production use, you would replace this with a real image embedding model.
const generateMockEmbedding = (): number[] => {
  const embedding: number[] = [];
  for (let i = 0; i < 512; i++) {
    embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
  }
  return embedding;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!ELASTICSEARCH_URL || !ELASTICSEARCH_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing required environment variables for sync function.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const esClient = new Client({
      node: ELASTICSEARCH_URL,
      auth: { apiKey: ELASTICSEARCH_API_KEY }
    });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const indexName = 'gallery_images';

    // 1. Check if index exists, create if not
    const { exists } = await esClient.indices.exists({ index: indexName });
    if (!exists) {
      console.log('Creating new index...');
      await esClient.indices.create({
        index: indexName,
        mappings: {
          properties: {
            image_id: { type: 'keyword' },
            image_url: { type: 'text' },
            alt_text: { type: 'text' },
            file_name: { type: 'keyword' },
            user_id: { type: 'keyword' },
            created_at: { type: 'date' },
            embedding: {
              type: 'dense_vector',
              dims: 512
            }
          }
        }
      });
    } else {
      console.log('Index already exists, checking mapping...');
      // Verify existing mapping
      const { body: mapping } = await esClient.indices.getMapping({ index: indexName });
      const currentDims = mapping[indexName].mappings.properties.embedding.dims;

      if (currentDims !== 512) {
        console.log('Updating index mapping to ensure correct dimensions...');
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            embedding: {
              type: 'dense_vector',
              dims: 512
            }
          }
        });
      }
    }

    // 2. Fetch all images from Supabase DB
    console.log('Fetching images from Supabase...');
    const { data: images, error: dbError } = await supabaseAdmin
      .from('gallery_images')
      .select('id, image_url, alt_text, file_name, user_id, created_at');

    if (dbError) throw dbError;
    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ message: 'Index is ready. No images found in the gallery to sync.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${images.length} images to sync`);

    // 3. Prepare bulk operations for Elasticsearch
    console.log('Preparing bulk operations...');
    const operations = images.flatMap(doc => {
      const embedding = generateMockEmbedding();
      console.log('Generated embedding:', embedding.slice(0, 5), '...'); // Log first 5 values
      return [
        { index: { _index: indexName, _id: doc.id } },
        {
          image_id: doc.id,
          image_url: doc.image_url,
          alt_text: doc.alt_text,
          file_name: doc.file_name,
          user_id: doc.user_id,
          created_at: doc.created_at,
          embedding: embedding,
        }
      ];
    });

    // 4. Execute bulk operation
    console.log('Executing bulk operation...');
    const bulkResponse = await esClient.bulk({ refresh: true, operations });

    if (bulkResponse.errors) {
      console.error('Some documents failed to index in bulk operation:', bulkResponse.errors);
    } else {
      console.log('Bulk operation completed successfully');
    }

    return new Response(JSON.stringify({ message: `Successfully created index and synced ${images.length} images.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Sync Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})