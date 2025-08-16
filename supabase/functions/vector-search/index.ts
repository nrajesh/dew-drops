// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { pipeline, RawImage } from 'https://esm.sh/@xenova/transformers@2.11.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

class FeatureExtractionPipeline {
  static task = 'feature-extraction';
  static model = 'Xenova/clip-vit-base-patch32';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { quantized: true, progress_callback });
    }
    return this.instance;
  }
}

serve(async (req) => {
  // This is needed for CORS and preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, content } = await req.json()

    if (!type || !content) {
      throw new Error('Missing "type" or "content" in request body.');
    }

    const extractor = await FeatureExtractionPipeline.getInstance();
    let embedding;

    if (type === 'image') {
      const image = await RawImage.fromURL(content);
      const output = await extractor(image, { pooling: 'mean', normalize: true });
      embedding = Array.from(output.data);
    } else if (type === 'text') {
      const output = await extractor(content, { pooling: 'mean', normalize: true });
      embedding = Array.from(output.data);
    } else {
      throw new Error('Invalid "type" specified. Must be "image" or "text".');
    }

    return new Response(JSON.stringify({ embedding }), {
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