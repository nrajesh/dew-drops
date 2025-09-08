import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// The key for the chatbot feature, hardcoded for security.
const CHATBOT_FEATURE_KEY = 'chatbot';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the admin user's ID. We assume there's only one admin,
    // so we can grab the first user_id we find associated with any feature toggle.
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('feature_toggles')
      .select('user_id')
      .limit(1)
      .single();

    if (adminError || !adminData) {
      throw new Error('Could not find an admin user to update the feature toggle for.');
    }

    const adminUserId = adminData.user_id;
    const autoDisableUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('feature_toggles')
      .update({
        is_enabled: false,
        auto_disabled_until: autoDisableUntil,
      })
      .eq('user_id', adminUserId)
      .eq('feature_key', CHATBOT_FEATURE_KEY);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ message: `Feature '${CHATBOT_FEATURE_KEY}' has been auto-disabled.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error auto-disabling feature:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})