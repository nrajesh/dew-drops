/// <reference types="../../../src/types/deno.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();

    // Convert to base64
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Generate embedding using Gemini
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: blob.type,
          data: base64Image.split(',')[1]
        }
      },
      { text: "Generate a 512-dimensional embedding for this image. Respond with a JSON object containing only the embedding array, no other text or formatting." }
    ]);

    const responseText = await result.response.text();

    // Try to parse the response as JSON first
    let embedding;
    try {
      embedding = JSON.parse(responseText);
    } catch (e) {
      // If parsing fails, try to extract the array from the text
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        embedding = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error("Could not extract embedding array from response");
      }
    }

    // Ensure it's a 512-dimensional vector
    if (!Array.isArray(embedding) || embedding.length !== 512) {
      throw new Error("Invalid embedding format - expected a 512-dimensional array");
    }

    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error("Error generating embedding:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})