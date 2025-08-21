import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

declare global {
  const Deno: {
    env: {
      get: (key: string) => string | undefined;
    };
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query, similarity_threshold, match_count } = await req.json()

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    )

    // Generate embedding for the search query
    const embeddingResponse = await supabase
      .rpc('generate_embedding', {
        text: query,
        model: 'text-embedding-3-small'
      })

    if (embeddingResponse.error) {
      throw new Error(embeddingResponse.error.message)
    }

    const query_embedding = embeddingResponse.data

    // Perform the vector search using the custom function
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_gallery_images', {
        query_embedding,
        similarity_threshold,
        match_count
      })

    if (searchError) {
      throw new Error(searchError.message)
    }

    return new Response(JSON.stringify({ results: searchResults }), {
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