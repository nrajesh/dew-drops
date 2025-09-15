import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type SupabaseClient = ReturnType<typeof createClient>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resetData = async (supabase: SupabaseClient) => {
  // Delete in an order that respects foreign key constraints (posts may reference gallery_images).
  const deletionOrder = ['posts', 'travel_locations', 'gallery_images', 'chatbot_knowledge'];
  for (const table of deletionOrder) {
    let query = supabase.from(table).delete();
    if (table === 'chatbot_knowledge') {
      // The 'id' is an integer, so we compare with an integer
      query = query.neq('id', 0);
    } else {
      // The 'id' is a UUID, so we compare with a UUID string
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { error } = await query;
    if (error) throw new Error(`Failed to reset ${table}: ${error.message}`);
  }

  // Re-initialize the chatbot knowledge base with the default placeholder.
  const { error: insertError } = await supabase.from('chatbot_knowledge').insert({
    id: 1,
    content: 'This is the knowledge base for the AI chatbot. Click "Generate from Portfolio" to automatically populate this with your latest content, or write your own from scratch.'
  });
  if (insertError) throw new Error(`Failed to re-initialize chatbot_knowledge: ${insertError.message}`);
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

    // 2. Create an admin client with the SERVICE_ROLE_KEY to bypass RLS for data manipulation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    await resetData(supabaseAdmin);

    return new Response(JSON.stringify({ message: 'Reset successful' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});