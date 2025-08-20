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
import { useFeatureToggles } from "@/contexts/FeatureToggleContext";
import { navFeatures } from "@/config/navigation";

const VIDEOS_PER_PAGE = 4;

const Videos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toggles, loading: togglesLoading } = useFeatureToggles();

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    const fetchVideos = async () => {
      if (togglesLoading) return; // Wait for toggles to load

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
        let errorMessage = "Failed to search for videos.";
        if (err.message.includes('YouTube API key')) {
            errorMessage = "YouTube API key is missing. Please configure it in your Supabase project secrets.";
        } else if (err.message.includes('feature_toggles')) {
            errorMessage = "Video search functionality is currently disabled. Please enable it in Feature Toggles.";
        }
        showError(errorMessage);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [debouncedSearchTerm, togglesLoading, toggles]); // Re-fetch when toggles change

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
    <div className="flex flex-col min-h-[calc(100vh-112px)]" ref={containerRef}>
      <div className="flex-grow space-y-6 pb-8">
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
          {loading || togglesLoading ? (
            Array.from({ length: VIDEOS_PER_PAGE }).map((_, index) => (
              <Card key={index}>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><AspectRatio ratio={16 / 9}><Skeleton className="h-full w-full rounded-lg" /></AspectRatio></CardContent>
              </Card>
            ))
          ) : paginatedVideos.length > 0 ? (
            paginatedVideos.map((video) => (
              <Card key={video.id} className="flex flex-col h-full">
                <CardHeader><CardTitle>{video.title}</CardTitle></CardHeader>
                <CardContent className="flex-grow">
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
      </div>
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

export default Videos;