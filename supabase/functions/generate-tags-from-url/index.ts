// @ts-expect-error Deno imports are not recognized by TypeScript locally
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function bufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const normalizeTag = (tag: string) => tag.normalize('NFC').trim();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const GEMINI_MODEL_NAME = Deno.env.get('GEMINI_MODEL_NAME');

  if (!GEMINI_API_KEY || !GEMINI_MODEL_NAME) {
    return new Response(JSON.stringify({ error: 'AI service is not configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { imageUrl, imageId } = await req.json();
    if (!imageUrl || !imageId) {
      throw new Error("imageUrl and imageId are required.");
    }

    // Fetch the image from the signed URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from URL: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = bufferToBase64(imageBuffer);
    const mimeType = imageResponse.headers.get('Content-Type') || 'image/jpeg';

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

    const prompt = "Analyze this image and provide a comma-separated list of 5-10 relevant keywords for search purposes. Only return the keywords, nothing else. Example: 'nature, mountain, lake, sunset, landscape'";

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const tags = text.split(',').map(tag => normalizeTag(tag.trim().toLowerCase())).filter(Boolean);

    // Update the database record directly from the edge function
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: updateError } = await supabaseAdmin
      .from('gallery_images')
      .update({ tags: tags })
      .eq('id', imageId);

    if (updateError) {
      throw new Error(`Failed to update tags in database: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true, tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});