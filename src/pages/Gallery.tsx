import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useEffect, useState, useMemo, useRef, lazy, Suspense, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/PaginationControls";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { Button } from "@/components/ui/button";
import { searchImagesByMetadata } from "@/utils/embeddings"; // Import the utility function

const LazyImageLightbox = lazy(() => import("@/components/ImageLightbox").then(module => ({ default: module.ImageLightbox })));

const IMAGES_PER_PAGE = 9;

const Gallery = () => {
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [displayImages, setDisplayImages] = useState<GalleryImage[]>([]); // Images currently being displayed after filtering/search
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeMake, setActiveMake] = useState<string | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching gallery images:", error);
      setAllImages([]);
      setDisplayImages([]);
    } else {
      setAllImages(data as GalleryImage[]);
      // Initial display of all images
      setDisplayImages(data as GalleryImage[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Effect to handle filtering/searching
  useEffect(() => {
    const applyFiltersAndSearch = async () => {
      let currentFilteredImages = allImages;

      if (debouncedSearchTerm) {
        currentFilteredImages = await searchImagesByMetadata(debouncedSearchTerm, allImages);
      } else {
        currentFilteredImages = allImages.filter(image => {
          const makeValue = image.exif_data?.Make;
          const makeString = typeof makeValue === 'object' && makeValue !== null && 'description' in makeValue ? makeValue.description : makeValue;
          const makeFilter = activeMake === 'all' || makeString === activeMake;
          return makeFilter;
        });
      }
      setDisplayImages(currentFilteredImages);
      setCurrentPage(1); // Reset to first page on filter/search change
    };

    applyFiltersAndSearch();
  }, [allImages, activeMake, debouncedSearchTerm]);


  const deviceMakes = useMemo(() => {
    const makes = allImages.map(img => {
      const make = img.exif_data?.Make;
      if (typeof make === 'object' && make !== null && 'description' in make) {
        return make.description;
      }
      return make;
    }).filter(Boolean) as string[];
    return Array.from(new Set(makes)).sort();
  }, [allImages]);

  const totalPages = Math.ceil(displayImages.length / IMAGES_PER_PAGE);
  const paginatedImages = displayImages.slice(
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

  const getThumbnailUrl = (fileName: string) => {
    const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null || displayImages.length < 2) return;
    if (direction === 'next') {
      setSelectedImageIndex((prevIndex) => (prevIndex! + 1) % displayImages.length);
    } else {
      setSelectedImageIndex((prevIndex) => (prevIndex! - 1 + displayImages.length) % displayImages.length);
    }
  };

  const selectedImage = selectedImageIndex !== null ? displayImages[selectedImageIndex] : null;

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
                placeholder="Search descriptions, tags, or filenames..."
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
                    const globalIndex = displayImages.findIndex(img => img.id === image.id);
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
          hasNext={displayImages.length > 1}
          hasPrev={displayImages.length > 1}
          onUpdate={fetchImages}
        />
      </Suspense>
    </>
  );
};

export default Gallery;