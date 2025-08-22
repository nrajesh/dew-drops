import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { queryEmbedding, similarityThreshold = 0.7, matchCount = 10 } = await req.json();

    if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length !== 512) {
      return new Response(JSON.stringify({ error: 'Valid 512-dimensional query embedding is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use the vector search function we created earlier
    const { data, error } = await supabase.rpc('search_gallery_images', {
      query_embedding: queryEmbedding,
      similarity_threshold: similarityThreshold,
      match_count: matchCount
    })

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ results: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error("Error searching images:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})