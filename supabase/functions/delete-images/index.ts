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
    const { image_ids } = await req.json()

    if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid image_ids parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete images from Elasticsearch
    const bulkBody = image_ids.flatMap(id => [
      { delete: { _index: 'gallery_images', _id: id } }
    ])

    const response = await fetch(`${ELASTICSEARCH_URL}/_bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`
      },
      body: bulkBody.map(item => JSON.stringify(item)).join('\n') + '\n'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to delete images from Elasticsearch: ${errorData.error?.reason || response.statusText}`)
    }

    const result = await response.json()

    // Check for errors in the bulk response
    if (result.errors) {
      const errorItems = result.items.filter((item: any) => item.delete?.error)
      console.error('Some items failed to delete:', errorItems)
    }

    return new Response(
      JSON.stringify({ success: true, deleted_count: image_ids.length - (result.errors ? result.items.filter((item: any) => item.delete?.error).length : 0) }),
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