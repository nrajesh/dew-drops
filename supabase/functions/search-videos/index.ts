import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { searchTerm } = await req.json()
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    let userId: string | null = null;
    if (token && SUPABASE_JWT_SECRET) {
      try {
        const { payload } = await verify(token, SUPABASE_JWT_SECRET, 'HS256');
        userId = payload.sub as string;
      } catch (jwtError) {
        console.warn('JWT verification failed:', jwtError.message);
      }
    }

    // Check if YouTube search is enabled
    let youtubeSearchEnabled = false;
    if (userId) {
      const { data: toggleData, error: toggleError } = await supabase
        .from('feature_toggles')
        .select('is_enabled')
        .eq('user_id', userId)
        .eq('feature_key', 'youtube_search')
        .single();

      if (toggleError) {
        console.error('Error fetching YouTube search toggle:', toggleError);
        // If there's an error, default to false to be safe
        youtubeSearchEnabled = false;
      } else if (toggleData) {
        youtubeSearchEnabled = toggleData.is_enabled;
        console.log(`YouTube search toggle value: ${youtubeSearchEnabled}`);
      } else {
        console.log('No specific YouTube search toggle setting for user, defaulting to false');
        youtubeSearchEnabled = false;
      }
    } else {
      console.log('No user logged in, defaulting to false for YouTube search');
      youtubeSearchEnabled = false;
    }

    // Only proceed with YouTube search if enabled and API key exists
    if (!youtubeSearchEnabled || !YOUTUBE_API_KEY) {
      console.log('Skipping YouTube search due to disabled feature or missing API key');
      // Just search the local database
      const { data: dbTitleMatches, error: dbError } = await supabase
        .from('videos')
        .select('id, title, youtube_id, created_at, user_id')
        .ilike('title', `%${searchTerm}%`);

      if (dbError) throw dbError;

      return new Response(JSON.stringify(dbTitleMatches), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // If YouTube search is enabled, perform both searches
    console.log('Performing YouTube search');

    // 1. Search the local database by title
    const { data: dbTitleMatches, error: dbError } = await supabase
      .from('videos')
      .select('id, title, youtube_id, created_at, user_id')
      .ilike('title', `%${searchTerm}%`);
    if (dbError) throw dbError;

    let finalVideos = dbTitleMatches;

    // 2. Search YouTube API
    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchTerm)}&key=${YOUTUBE_API_KEY}&type=video&maxResults=50`;
    const youtubeResponse = await fetch(youtubeApiUrl);

    if (!youtubeResponse.ok) {
      const errorBody = await youtubeResponse.json();
      console.error('YouTube API Error:', errorBody);
      // If YouTube search fails, just return the local results
      return new Response(JSON.stringify(finalVideos), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const youtubeData = await youtubeResponse.json();
    const youtubeVideoIds = youtubeData.items.map((item: any) => item.id.videoId);

    if (youtubeVideoIds.length > 0) {
      const { data: youtubeMatchesInDb, error: youtubeDbError } = await supabase
        .from('videos')
        .select('id, title, youtube_id, created_at, user_id')
        .in('youtube_id', youtubeVideoIds);
      if (youtubeDbError) throw youtubeDbError;

      const existingVideoIds = new Set(finalVideos.map(v => v.id));
      youtubeMatchesInDb.forEach(video => {
        if (!existingVideoIds.has(video.id)) {
          finalVideos.push(video);
        }
      });
    }

    finalVideos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify(finalVideos), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})