// @ts-ignore
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'

// Configuration for Edge Function deployment:
// memory = 1024
// timeout = 30

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

// Helper to normalize and trim tags (duplicated for Edge Function context)
const normalizeTag = (tag: string) => tag.normalize('NFC').trim();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const GEMINI_MODEL_NAME = Deno.env.get('GEMINI_MODEL_NAME');

  if (!GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY secret in Supabase project');
    return new Response(JSON.stringify({ error: 'AI service is not configured: Missing API Key.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!GEMINI_MODEL_NAME) {
    console.error('Missing GEMINI_MODEL_NAME secret in Supabase project');
    return new Response(JSON.stringify({ error: 'AI service is not configured: Missing Gemini Model Name.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { fileName } = await req.json()
    if (!fileName) {
      throw new Error("fileName is required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('gallery')
      .download(fileName)

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`)
    }

    const imageBuffer = await fileData.arrayBuffer();
    const imageBase64 = bufferToBase64(imageBuffer);
    const mimeType = fileData.type;

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

    const tags = text.split(',').map(tag => normalizeTag(tag.trim().toLowerCase())).filter(Boolean); // Apply normalization here

    return new Response(JSON.stringify({ tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})