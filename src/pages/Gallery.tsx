import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useEffect, useState, useMemo, useRef, lazy, Suspense, ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, Image as ImageIcon, AlertTriangle, FileText, Camera, Tag } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/PaginationControls";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { Button } from "@/components/ui/button";
import { generateEmbedding, searchSimilarImages, generateSearchEmbedding, searchImagesByMetadata } from "@/utils/embeddings";
import { showError } from "@/utils/toast";

const LazyImageLightbox = lazy(() => import("@/components/ImageLightbox").then(module => ({ default: module.ImageLightbox })));

const IMAGES_PER_PAGE = 9;

const Gallery = () => {
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeMake, setActiveMake] = useState<string | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GalleryImage[]>([]);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetTime: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching gallery images:", error);
      } else {
        setAllImages(data as GalleryImage[]);
      }
      setLoading(false);
    };

    fetchImages();
  }, []);

  const deviceMakes = useMemo(() => Array.from(
    new Set(allImages.map(img => img.exif_data?.Make).filter(Boolean) as string[])
  ).sort(), [allImages]);

  const filteredImages = useMemo(() => {
    if (debouncedSearchTerm) {
      return searchResults;
    }

    return allImages.filter(image => {
      const makeFilter = activeMake === 'all' || image.exif_data?.Make === activeMake;
      return makeFilter;
    });
  }, [allImages, activeMake, debouncedSearchTerm, searchResults]);

  const totalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE);
  const paginatedImages = filteredImages.slice(
    (currentPage - 1) * IMAGES_PER_PAGE,
    currentPage * IMAGES_PER_PAGE
  );

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: selectedImageIndex === null,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeMake, debouncedSearchTerm]);

  const getThumbnailUrl = (fileName: string) => {
    const { data } = supabase.storage.from('gallery').getPublicUrl(fileName, {
      transform: { width: 400, height: 300, resize: 'cover' },
    });
    return data.publicUrl;
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null || filteredImages.length < 2) return;
    if (direction === 'next') {
      setSelectedImageIndex((prevIndex) => (prevIndex! + 1) % filteredImages.length);
    } else {
      setSelectedImageIndex((prevIndex) => (prevIndex! - 1 + filteredImages.length) % filteredImages.length);
    }
  };

  const selectedImage = selectedImageIndex !== null ? filteredImages[selectedImageIndex] : null;

  const handleImageSearch = async () => {
    if (!debouncedSearchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Perform both metadata and semantic search
      const [metadataResults, semanticResults] = await Promise.all([
        searchImagesByMetadata(debouncedSearchTerm, allImages),
        (async () => {
          // First, try to find an image that matches the search term
          const matchingImage = allImages.find(img =>
            img.alt_text?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
          );

          if (matchingImage && matchingImage.embedding) {
            // If we find a matching image with an embedding, use it for similarity search
            return await searchSimilarImages(matchingImage.embedding, 20);
          } else {
            // If no matching image found, generate a search embedding based on the search term
            try {
              const searchEmbedding = await generateSearchEmbedding(debouncedSearchTerm);
              return await searchSimilarImages(searchEmbedding, 20);
            } catch (error: any) {
              if (error.message.includes('429')) {
                const rateLimitMatch = error.message.match(/quotaValue":"(\d+)"/);
                if (rateLimitMatch) {
                  const remaining = parseInt(rateLimitMatch[1], 10);
                  const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleTimeString();
                  setRateLimitInfo({ remaining, resetTime });
                }
              }
              throw error;
            }
          }
        })()
      ]);

      // Combine results, removing duplicates
      const combinedResults = [...metadataResults, ...semanticResults];
      const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());

      setSearchResults(uniqueResults);
    } catch (error: any) {
      console.error("Error performing image search:", error);
      showError("Failed to perform image search. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (debouncedSearchTerm) {
      handleImageSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm]);

  return (
    <>
      <div className="flex flex-col min-h-[calc(100vh-112px)]" ref={containerRef}>
        <div className="flex-grow space-y-6 pb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Gallery</h1>
            <p className="text-muted-foreground">A few snapshots from my life.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="relative sm:w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search descriptions..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {deviceMakes.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant={activeMake === 'all' ? 'default' : 'outline'} onClick={() => setActiveMake('all')}>
                All
              </Button>
              {deviceMakes.map(make => (
                <Button key={make} variant={activeMake === make ? 'default' : 'outline'} onClick={() => setActiveMake(make)}>
                  {make}
                </Button>
              ))}
            </div>
          )}

          {isSearching && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon className="h-4 w-4 animate-pulse" />
              <span>Searching for similar images...</span>
            </div>
          )}

          {rateLimitInfo && (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-yellow-700">
                API rate limit reached. You've made {50 - rateLimitInfo.remaining} requests today. The limit resets at {rateLimitInfo.resetTime}.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: IMAGES_PER_PAGE }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    <AspectRatio ratio={4 / 3}><Skeleton className="h-full w-full" /></AspectRatio>
                  </CardContent>
                </Card>
              ))
            ) : paginatedImages.length > 0 ? (
              paginatedImages.map((image) => (
                <Card
                  key={image.id}
                  className="overflow-hidden group cursor-pointer"
                  onClick={() => {
                    const globalIndex = filteredImages.findIndex(img => img.id === image.id);
                    setSelectedImageIndex(globalIndex);
                  }}
                >
                  <CardContent className="p-0">
                    <AspectRatio ratio={4 / 3}>
                      <img
                        src={getThumbnailUrl(image.file_name)}
                        alt={image.alt_text || "Gallery image"}
                        className="h-full w-full object-cover bg-background transition-transform duration-300 group-hover:scale-105"
                      />
                    </AspectRatio>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-10 border-dashed border-2 rounded-lg bg-muted">
                <p className="text-muted-foreground">No images found. Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-8">
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>
      <Suspense fallback={null}>
        <LazyImageLightbox
          image={selectedImage}
          onClose={() => setSelectedImageIndex(null)}
          onNavigate={handleNavigate}
          hasNext={filteredImages.length > 1}
          hasPrev={filteredImages.length > 1}
        />
      </Suspense>
    </>
  );
};

export default Gallery;