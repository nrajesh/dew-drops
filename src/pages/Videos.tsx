import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Video } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/PaginationControls";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { showError } from "@/utils/toast";

const VIDEOS_PER_PAGE = 4;

const Videos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('search-videos', {
          body: { searchTerm: debouncedSearchTerm },
        });

        if (error) throw error;
        
        if (data.error) throw new Error(data.error);

        setVideos(data as Video[]);
      } catch (err: any) {
        console.error("Error searching videos:", err);
        if (err.message.includes('YouTube API key')) {
            showError("Video search is not configured. An administrator needs to add a YouTube API key.");
        } else {
            showError("Failed to search for videos.");
        }
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [debouncedSearchTerm]);

  const totalPages = Math.ceil(videos.length / VIDEOS_PER_PAGE);
  const paginatedVideos = videos.slice(
    (currentPage - 1) * VIDEOS_PER_PAGE,
    currentPage * VIDEOS_PER_PAGE
  );

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Videos</h1>
        <p className="text-muted-foreground">A collection of my favorite videos.</p>
      </div>

      <div className="relative sm:w-full sm:max-w-xs mx-auto">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search videos..."
          className="pl-8 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {loading ? (
          Array.from({ length: VIDEOS_PER_PAGE }).map((_, index) => (
            <Card key={index}>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><AspectRatio ratio={16 / 9}><Skeleton className="h-full w-full rounded-lg" /></AspectRatio></CardContent>
            </Card>
          ))
        ) : paginatedVideos.length > 0 ? (
          paginatedVideos.map((video) => (
            <Card key={video.id}>
              <CardHeader><CardTitle>{video.title}</CardTitle></CardHeader>
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
          <p className="text-muted-foreground text-center md:col-span-2">No videos found for your search.</p>
        )}
      </div>
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

export default Videos;