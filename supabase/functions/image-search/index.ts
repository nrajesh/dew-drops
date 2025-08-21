import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { Client } from "npm:@elastic/elasticsearch@8.15.0";

const ELASTICSEARCH_URL = Deno.env.get('ELASTICSEARCH_URL')
const ELASTICSEARCH_API_KEY = Deno.env.get('ELASTICSEARCH_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GalleryImageDocument {
  image_id: string;
  image_url: string;
  alt_text: string;
  file_name: string;
  user_id: string;
  embedding: number[];
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!ELASTICSEARCH_URL || !ELASTICSEARCH_API_KEY) {
    return new Response(JSON.stringify({ error: 'Elasticsearch credentials are not configured in Supabase secrets.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { queryEmbedding, limit } = await req.json()

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "queryEmbedding" in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Query embedding:', queryEmbedding.slice(0, 5), '...');

    const client = new Client({
      node: ELASTICSEARCH_URL,
      auth: { apiKey: ELASTICSEARCH_API_KEY }
    })

    const { exists } = await client.indices.exists({ index: 'gallery_images' });

    if (!exists) {
      console.log('Index does not exist');
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { body: mapping } = await client.indices.getMapping({ index: 'gallery_images' });
    const embeddingDims = mapping.gallery_images.mappings.properties.embedding.dims;
    console.log('Index embedding dimensions:', embeddingDims);

    if (queryEmbedding.length !== embeddingDims) {
      console.error(`Query embedding dimension (${queryEmbedding.length}) does not match index dimension (${embeddingDims})`);
      return new Response(JSON.stringify({ error: `Query embedding dimension (${queryEmbedding.length}) does not match index dimension (${embeddingDims})` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Executing search query...');
    const response = await client.search<GalleryImageDocument>({
      index: 'gallery_images',
      body: {
        size: limit || 10,
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
    })

    console.log('Search response:', {
      totalHits: response.hits.total,
      hits: response.hits.hits.length
    });

    const results = response.hits.hits.map(hit => ({
      id: hit._source!.image_id,
      image_url: hit._source!.image_url,
      alt_text: hit._source!.alt_text,
      file_name: hit._source!.file_name,
      user_id: hit._source!.user_id,
      created_at: hit._source!.created_at,
      exif_data: null,
      score: hit._score
    }))

    console.log('Returning results:', results.length);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})