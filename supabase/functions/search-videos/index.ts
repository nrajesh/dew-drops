// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
const YOUTUBE_SEARCH_ENABLED = Deno.env.get('YOUTUBE_SEARCH_ENABLED') !== 'false'

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // If no search term, return all videos
    if (!searchTerm) {
      const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 1. Search the local database by title
    const { data: dbTitleMatches, error: dbError } = await supabase
      .from('videos')
      .select('id')
      .ilike('title', `%${searchTerm}%`);
    if (dbError) throw dbError;
    const dbMatchingIds = dbTitleMatches.map(v => v.id);

    let youtubeMatchingIds: string[] = [];

    // Conditionally search YouTube API if the feature is enabled and the key exists
    if (YOUTUBE_SEARCH_ENABLED && YOUTUBE_API_KEY) {
      const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchTerm)}&key=${YOUTUBE_API_KEY}&type=video&maxResults=50`;
      const youtubeResponse = await fetch(youtubeApiUrl);
      if (!youtubeResponse.ok) {
        const errorBody = await youtubeResponse.json();
        console.error('YouTube API Error:', errorBody);
        // Don't throw an error, just log it and continue with DB results
      } else {
        const youtubeData = await youtubeResponse.json();
        const youtubeVideoIds = youtubeData.items.map((item: any) => item.id.videoId);

        if (youtubeVideoIds.length > 0) {
          const { data: youtubeMatchesInDb, error: youtubeDbError } = await supabase
            .from('videos')
            .select('id')
            .in('youtube_id', youtubeVideoIds);
          if (youtubeDbError) throw youtubeDbError;
          youtubeMatchingIds = youtubeMatchesInDb.map(v => v.id);
        }
      }
    }

    // 4. Combine and deduplicate IDs
    const allMatchingIds = [...new Set([...dbMatchingIds, ...youtubeMatchingIds])];

    if (allMatchingIds.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 5. Fetch full data for the matching videos
    const { data: finalVideos, error: finalError } = await supabase
      .from('videos')
      .select('*')
      .in('id', allMatchingIds)
      .order('created_at', { ascending: false });
    if (finalError) throw finalError;

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