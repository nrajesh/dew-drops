import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Create a stateless client with the ANON key to verify the user's JWT
    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false } } // Crucial for stateless environments
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const jwt = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser(jwt);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create an admin client with the SERVICE_ROLE_KEY to bypass RLS for a full export
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Only export content tables
    const tables = ['posts', 'gallery_images', 'travel_locations', 'chatbot_knowledge'];
    const exportData: { [key: string]: Record<string, unknown>[] } = {};

    for (const table of tables) {
      const { data, error } = await supabaseAdmin.from(table).select('*');
      if (error) throw error;

      // Sanitize backticks from posts content
      if (table === 'posts' && data) {
        data.forEach((post: Record<string, unknown>) => {
          if (post.content && typeof post.content === 'string') {
            const trimmed = post.content.trim();
            if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
              const lines = trimmed.split('\n');
              if (lines.length >= 2 && lines[0].startsWith('```') && lines[lines.length - 1].trim() === '```') {
                post.content = lines.slice(1, -1).join('\n').trim();
              }
            }
          }
        });
      }

      exportData[table] = data;
    }

    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});