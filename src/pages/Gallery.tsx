import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useEffect, useState, useMemo, useRef, lazy, Suspense, ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/PaginationControls";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { Button } from "@/components/ui/button";

const LazyImageLightbox = lazy(() => import("@/components/ImageLightbox").then(module => ({ default: module.ImageLightbox })));

const IMAGES_PER_PAGE = 3;

const Gallery = () => {
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeMake, setActiveMake] = useState<string | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
    return allImages.filter(image => {
      const makeFilter = activeMake === 'all' || image.exif_data?.Make === activeMake;
      const searchFilter = !debouncedSearchTerm || (image.alt_text && image.alt_text.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      return makeFilter && searchFilter;
    });
  }, [allImages, activeMake, debouncedSearchTerm]);

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
        <div className="mt-4">
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