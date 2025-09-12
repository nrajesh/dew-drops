import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type SupabaseClient = ReturnType<typeof createClient>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Order matters for foreign key constraints: delete child tables before parent tables.
// All these tables reference auth.users, so their relative order is flexible,
// but putting feature_toggles last might help if it's unexpectedly a parent.
const tablesToReset = ['posts', 'travel_locations', 'gallery_images', 'profiles', 'feature_toggles'];

const resetData = async (supabase: SupabaseClient) => {
  for (const table of tablesToReset) {
    // Delete all rows from the table. The 'neq' clause is a common pattern
    // to ensure the DELETE statement is not empty, which can sometimes be optimized away
    // by PostgreSQL in a way that bypasses RLS, but here we are using the service role key.
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`Failed to reset ${table}: ${error.message}`);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await resetData(supabase);

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