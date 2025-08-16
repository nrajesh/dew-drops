// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { pipeline, RawImage } from 'https://esm.sh/@xenova/transformers@2.16.1'

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
      console.log('Pipeline instance is null. Initializing...');
      this.instance = await pipeline(this.task, this.model, { quantized: true, progress_callback });
      console.log('Pipeline initialized successfully.');
    }
    return this.instance;
  }
}

serve(async (req) => {
  console.log(`[vector-search] Received request: ${req.method}`);
  if (req.method === 'OPTIONS') {
    console.log('[vector-search] Handling OPTIONS preflight request.');
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    console.log('[vector-search] Parsing request body...');
    const { type, content } = await req.json();
    console.log(`[vector-search] Request details - Type: ${type}`);

    if (!type || !content) {
      throw new Error('Missing "type" or "content" in request body.');
    }

    console.log('[vector-search] Getting feature extraction pipeline instance...');
    const extractor = await FeatureExtractionPipeline.getInstance();
    console.log('[vector-search] Pipeline instance obtained.');
    
    let embedding;

    if (type === 'image') {
      console.log(`[vector-search] Processing image from URL...`);
      const image = await RawImage.fromURL(content);
      console.log('[vector-search] Image loaded from URL.');
      const output = await extractor(image, { pooling: 'mean', normalize: true });
      embedding = Array.from(output.data);
      console.log('[vector-search] Image embedding generated.');
    } else if (type === 'text') {
      console.log(`[vector-search] Processing text...`);
      const output = await extractor(content, { pooling: 'mean', normalize: true });
      embedding = Array.from(output.data);
      console.log('[vector-search] Text embedding generated.');
    } else {
      throw new Error('Invalid "type" specified. Must be "image" or "text".');
    }

    console.log('[vector-search] Successfully generated embedding. Returning response.');
    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[vector-search] CRITICAL ERROR:', error);
    const errorMessage = {
      message: error.message,
      stack: error.stack,
    };
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});