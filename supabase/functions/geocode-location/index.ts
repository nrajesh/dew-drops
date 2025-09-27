import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Corrected: Server-side secrets are not prefixed with VITE_
  const MAPBOX_ACCESS_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  if (!MAPBOX_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: 'Mapbox access token is not configured as a server-side secret.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { locationName } = await req.json();

    if (!locationName) {
      return new Response(JSON.stringify({ error: 'Location name is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mapboxResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
    );
    const mapboxData = await mapboxResponse.json();

    if (!mapboxResponse.ok || !mapboxData.features || mapboxData.features.length === 0) {
      return new Response(JSON.stringify({ error: `Could not find coordinates for "${locationName}".` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [longitude, latitude] = mapboxData.features[0].center;

    return new Response(JSON.stringify({ latitude, longitude }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Geocoding Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});