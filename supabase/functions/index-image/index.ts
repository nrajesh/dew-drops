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
    const { image_id, alt_text, embedding } = await req.json()

    if (!image_id || !alt_text || !embedding) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: image_id, alt_text, or embedding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Index the image in Elasticsearch
    const response = await fetch(`${ELASTICSEARCH_URL}/gallery_images/_doc/${image_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`
      },
      body: JSON.stringify({
        alt_text: alt_text,
        embedding: embedding
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to index image in Elasticsearch: ${errorData.error?.reason || response.statusText}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})