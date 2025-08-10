import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// This secret needs to be set in your Supabase project settings
const MAPBOX_ACCESS_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!MAPBOX_ACCESS_TOKEN) {
    console.error('Missing MAPBOX_ACCESS_TOKEN secret in Supabase project');
    return new Response(JSON.stringify({ error: 'Geocoding service is not configured: Missing API Key.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { locationName } = await req.json()

    if (!locationName) {
      return new Response(JSON.stringify({ error: 'Missing locationName field' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      locationName
    )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;

    const geocodingResponse = await fetch(geocodingUrl);
    const data = await geocodingResponse.json();

    if (!geocodingResponse.ok || !data.features || data.features.length === 0) {
      console.error('Mapbox API Error:', data);
      throw new Error(`Could not find coordinates for "${locationName}". Please try a more specific name.`);
    }

    const [longitude, latitude] = data.features[0].center;

    return new Response(JSON.stringify({ latitude, longitude }), {
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