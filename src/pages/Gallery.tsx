import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Button } from "@/components/ui/button";

const Gallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeMake, setActiveMake] = useState<string | 'all'>('all');

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
        setImages(data as GalleryImage[]);
      }
      setLoading(false);
    };

    fetchImages();
  }, []);

  const deviceMakes = Array.from(
    new Set(images.map(img => img.exif_data?.Make).filter(Boolean) as string[])
  ).sort();

  const filteredImages = images.filter(image => {
    if (activeMake === 'all') return true;
    return image.exif_data?.Make === activeMake;
  });

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null || filteredImages.length < 2) return;

    if (direction === 'next') {
      setSelectedImageIndex((prevIndex) => (prevIndex! + 1) % filteredImages.length);
    } else {
      setSelectedImageIndex((prevIndex) => (prevIndex! - 1 + filteredImages.length) % filteredImages.length);
    }
  };

  const handleFilterClick = (make: string | 'all') => {
    setActiveMake(make);
    setSelectedImageIndex(null); // Reset lightbox when filter changes
  };

  const selectedImage = selectedImageIndex !== null ? filteredImages[selectedImageIndex] : null;

  return (
    <>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Gallery</h1>
          <p className="text-muted-foreground">A few snapshots from my life.</p>
        </div>

        {deviceMakes.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant={activeMake === 'all' ? 'default' : 'outline'} onClick={() => handleFilterClick('all')}>
              All
            </Button>
            {deviceMakes.map(make => (
              <Button key={make} variant={activeMake === make ? 'default' : 'outline'} onClick={() => handleFilterClick(make)}>
                {make}
              </Button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <AspectRatio ratio={4 / 3}>
                    <Skeleton className="h-full w-full" />
                  </AspectRatio>
                </CardContent>
              </Card>
            ))
          ) : filteredImages.length > 0 ? (
            filteredImages.map((image) => (
              <Card 
                key={image.id} 
                className="overflow-hidden group cursor-pointer"
                onClick={() => {
                  const filteredIndex = filteredImages.findIndex(img => img.id === image.id);
                  setSelectedImageIndex(filteredIndex);
                }}
              >
                <CardContent className="p-0">
                  <AspectRatio ratio={4 / 3}>
                    <img
                      src={image.image_url}
                      alt={image.alt_text || "Gallery image"}
                      className="h-full w-full object-cover bg-background transition-transform duration-300 group-hover:scale-105"
                    />
                  </AspectRatio>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10 border-dashed border-2 rounded-lg bg-muted">
              <p className="text-muted-foreground">
                {images.length > 0 ? `No images found for filter "${activeMake}".` : "The gallery is currently empty."}
              </p>
              {images.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">Go to "Manage Gallery" to add your first photo!</p>
              )}
            </div>
          )}
        </div>
      </div>
      <ImageLightbox 
        image={selectedImage} 
        onClose={() => setSelectedImageIndex(null)}
        onNavigate={handleNavigate}
        hasNext={filteredImages.length > 1}
        hasPrev={filteredImages.length > 1}
      />
    </>
  );
};

export default Gallery;