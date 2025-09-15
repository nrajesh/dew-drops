import { useState } from "react";
import type { GalleryImage } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Eye, CheckCircle } from "lucide-react";

interface UnpublishedListProps {
  images: GalleryImage[];
  onPublish: (image: GalleryImage) => void;
}

export const UnpublishedList = ({ images, onPublish }: UnpublishedListProps) => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-center py-10 border-dashed border-2 rounded-lg bg-muted">
        <p className="text-muted-foreground">No unpublished images found.</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[500px] border rounded-lg">
        <div className="p-4 space-y-2">
          {images.map((image) => (
            <div
              key={image.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
            >
              <span className="font-medium text-sm truncate pr-4">
                {image.alt_text || image.file_name.split('/').pop()?.split('_').slice(1).join('_')}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImage(image)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPublish(image)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <ImageLightbox
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
        onNavigate={() => {}}
        hasNext={false}
        hasPrev={false}
      />
    </>
  );
};