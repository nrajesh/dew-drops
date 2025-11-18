import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// @ts-ignore - This is a valid Deno import, but may show an error in some IDEs
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.15.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl, imageId } = await req.json();
    if (!imageUrl || !imageId) {
      return new Response(JSON.stringify({ error: 'imageUrl and imageId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: response.headers.get('content-type') || 'image/jpeg',
      },
    };

    const prompt = "Analyze this image and provide 5-10 relevant tags as a comma-separated list. Focus on objects, themes, colors, and style. For example: 'nature, mountains, sunset, landscape, orange sky'.";

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text();
    const tags = text.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabaseAdmin
      .from('gallery_images')
      .update({ tags })
      .eq('id', imageId);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})