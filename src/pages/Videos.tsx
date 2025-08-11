import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Video } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const Videos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching videos:", error);
      } else {
        setVideos(data as Video[]);
      }
      setLoading(false);
    };

    fetchVideos();
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Videos</h1>
        <p className="text-muted-foreground">A collection of my favorite videos.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <AspectRatio ratio={16 / 9}>
                  <Skeleton className="h-full w-full rounded-lg" />
                </AspectRatio>
              </CardContent>
            </Card>
          ))
        ) : videos.length > 0 ? (
          videos.map((video) => (
            <Card key={video.id}>
              <CardHeader>
                <CardTitle>{video.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <AspectRatio ratio={16 / 9}>
                  <iframe
                    className="rounded-lg"
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${video.youtube_id}`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </AspectRatio>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground text-center md:col-span-2">No videos have been added yet.</p>
        )}
      </div>
    </div>
  );
};

export default Videos;