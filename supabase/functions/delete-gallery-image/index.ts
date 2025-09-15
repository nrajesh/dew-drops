import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth client to verify the user's JWT and get their identity
    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not found");

    // Admin client to perform actions with elevated privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { imageId } = await req.json();
    if (!imageId) throw new Error("Image ID is required");

    // Fetch the image record to get its file_name and verify ownership
    const { data: image, error: fetchError } = await supabaseAdmin
      .from('gallery_images')
      .select('file_name, user_id')
      .eq('id', imageId)
      .single();

    if (fetchError) throw new Error("Image not found or database error.");
    if (!image) throw new Error("Image not found.");

    // CRITICAL SECURITY CHECK: Ensure the person deleting the image is the owner
    if (image.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete the file from Supabase Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('gallery')
      .remove([image.file_name]);

    if (storageError) {
      console.error(`Storage deletion failed for ${image.file_name}:`, storageError.message);
    }

    // Delete the record from the database
    const { error: dbError } = await supabaseAdmin
      .from('gallery_images')
      .delete()
      .eq('id', imageId);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ message: 'Image deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})