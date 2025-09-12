import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type SupabaseClient = ReturnType<typeof createClient>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const tablesInOrder = ['feature_toggles', 'gallery_images', 'travel_locations', 'posts'];

const wipeData = async (supabase: SupabaseClient) => {
  for (const table of [...tablesInOrder].reverse()) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`Failed to delete from ${table}: ${error.message}`);
  }
};

const importData = async (supabase: SupabaseClient, data: { [key: string]: any[] }) => {
  for (const table of tablesInOrder) {
    if (data[table] && data[table].length > 0) {
      const { error } = await supabase.from(table).insert(data[table]);
      if (error) throw new Error(`Failed to import to ${table}: ${error.message}`);
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user with the ANON key
    const authHeader = req.headers.get('Authorization')!;
    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseAuthClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create an admin client with the SERVICE_ROLE_KEY to perform the import
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const importPayload = await req.json();

    await wipeData(supabaseAdmin);
    await importData(supabaseAdmin, importPayload);

    return new Response(JSON.stringify({ message: 'Import successful' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});