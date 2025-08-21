/// <reference types="https://deno.land/x/deno/types.d.ts" />
/// <reference types="https://esm.sh/@types/supabase" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ELASTICSEARCH_URL = Deno.env.get('ELASTICSEARCH_URL') ?? ''
const ELASTICSEARCH_API_KEY = Deno.env.get('ELASTICSEARCH_API_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query_embedding, similarity_threshold, match_count } = await req.json()

    if (!query_embedding || !similarity_threshold || !match_count) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: query_embedding, similarity_threshold, or match_count' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Search in Elasticsearch
    const elasticsearchResponse = await fetch(`${ELASTICSEARCH_URL}/gallery_images/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`
      },
      body: JSON.stringify({
        size: match_count,
        query: {
          script_score: {
            query: { match_all: {} },
            script: {
              source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
              params: { query_vector: query_embedding }
            }
          }
        }
      })
    })

    if (!elasticsearchResponse.ok) {
      throw new Error(`Elasticsearch search failed: ${elasticsearchResponse.statusText}`)
    }

    const elasticsearchData = await elasticsearchResponse.json()

    // Get the image IDs from Elasticsearch results
    const imageIds = elasticsearchData.hits.hits.map((hit: any) => hit._id)

    if (imageIds.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the full image data from Supabase
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .in('id', imageIds)

    if (error) {
      console.error('Error fetching images from Supabase:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch images from database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map the results to include similarity scores
    const resultsWithScores = data.map((image: any) => {
      const hit = elasticsearchData.hits.hits.find((h: any) => h._id === image.id)
      return {
        ...image,
        similarity: hit ? hit._score : 0
      }
    })

    // Sort by similarity score in descending order
    resultsWithScores.sort((a: any, b: any) => b.similarity - a.similarity)

    // Filter by similarity threshold
    const filteredResults = resultsWithScores.filter((result: any) => result.similarity > similarity_threshold)

    return new Response(
      JSON.stringify({ results: filteredResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})