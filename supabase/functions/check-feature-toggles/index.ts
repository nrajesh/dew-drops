import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This is a public function, but we only allow POST to prevent browser caching.
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Use the service role key to bypass RLS for this internal maintenance task.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // Find toggles that were auto-disabled and whose timer has expired.
    const { data: togglesToReEnable, error: selectError } = await supabaseAdmin
      .from('feature_toggles')
      .select('feature_key')
      .lt('auto_disabled_until', now)
      .not('auto_disabled_until', 'is', null);

    if (selectError) {
      throw selectError;
    }

    if (togglesToReEnable && togglesToReEnable.length > 0) {
      // Re-enable them by setting is_enabled to true and clearing the timer.
      const { error: updateError } = await supabaseAdmin
        .from('feature_toggles')
        .update({ is_enabled: true, auto_disabled_until: null })
        .in('feature_key', togglesToReEnable.map(t => t.feature_key));
      
      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({ message: `Re-enabled ${togglesToReEnable.length} feature(s).` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: 'No features to re-enable.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error checking feature toggles:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})