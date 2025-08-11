import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const Gallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <p className="text-muted-foreground">A few snapshots from my life.</p>
      </div>
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
        ) : images.length > 0 ? (
          images.map((image) => (
            <Card key={image.id} className="overflow-hidden group">
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
            <p className="text-muted-foreground">The gallery is currently empty.</p>
            <p className="text-sm text-muted-foreground mt-2">Go to "Manage Gallery" to add your first photo!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;