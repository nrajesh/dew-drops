import React, { useEffect, useCallback, useState, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Tag,
  Info,
  ShoppingCart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GalleryImage } from "@/types";
import { showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { ExifDataDisplay } from "./gallery/ExifDataDisplay";

interface ImageLightboxProps {
  image: GalleryImage | null;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  hasNext: boolean;
  hasPrev: boolean;
  onUpdate: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  image,
  onClose,
  onNavigate,
  hasNext,
  hasPrev,
  onUpdate,
}) => {
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const [showExif, setShowExif] = useState(false);
  const [showPurchaseDisabledOverlay, setShowPurchaseDisabledOverlay] =
    useState(false);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(deltaX) < 50) return;
      if (deltaX < 0 && hasNext) onNavigate("next");
      if (deltaX > 0 && hasPrev) onNavigate("prev");
    },
    [hasNext, hasPrev, onNavigate],
  );

  const handleDelete = async () => {
    if (
      !image ||
      !confirm(
        "Are you sure you want to delete this image? This action cannot be undone.",
      )
    )
      return;

    // Simulation: local delete
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log("Deleted image locally (Simulation):", image.file_name);

    showSuccess("Image deleted successfully (Simulation: local preview mode).");
    onClose();
    onUpdate();
  };

  const handleShowExif = () => {
    setShowExif(true);
  };

  const handlePurchase = () => {
    if (!image) return;

    if (image.purchase_link) {
      window.open(image.purchase_link, "_blank", "noopener,noreferrer");
    } else {
      setShowPurchaseDisabledOverlay(true);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!image) return;
      if (e.key === "ArrowRight" && hasNext) {
        onNavigate("next");
      } else if (e.key === "ArrowLeft" && hasPrev) {
        onNavigate("prev");
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [image, hasNext, hasPrev, onNavigate, onClose],
  );

  useEffect(() => {
    if (image) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [image, handleKeyDown]);

  if (!image) return null;

  const imageUrl = image.image_url || "/placeholder.svg";

  return (
    <>
      <Dialog open={!!image} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{image.alt_text || "Gallery Image"}</DialogTitle>
            <DialogDescription>
              A larger view of the selected image. Use arrow keys to navigate
              between images.
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-black/50 rounded-full h-10 w-10"
            onClick={onClose}
            aria-label="Close Lightbox"
          >
            <X className="h-6 w-6" />
          </Button>

          <div
            className="relative flex items-center justify-center h-[80vh] cursor-pointer"
            onClick={onClose}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {hasPrev && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-10 text-white hover:bg-black/50"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate("prev");
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-10 text-white hover:bg-black/50"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate("next");
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            <div className="w-full h-full flex items-center justify-center">
              <img
                src={imageUrl}
                alt={image.alt_text || "Gallery image"}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>

          <div
            className="bg-black/70 p-4 rounded-b-lg text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col">
              <p className="text-lg font-semibold">
                {image.alt_text || "Image Details"}
              </p>

              {image.tags && image.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <Tag className="h-4 w-4 mr-2 text-gray-400" />
                  {image.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-gray-600 text-white hover:bg-gray-500"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleShowExif}>
                <Info className="h-4 w-4 mr-2" /> EXIF Data
              </Button>

              <Button variant="default" size="sm" onClick={handlePurchase}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Purchase
              </Button>

              {isAuthenticated && (
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExif} onOpenChange={setShowExif}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" /> EXIF Data
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detailed EXIF metadata for the selected image.
            </DialogDescription>
          </DialogHeader>
          <ExifDataDisplay exifData={image?.exif_data} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPurchaseDisabledOverlay}
        onOpenChange={setShowPurchaseDisabledOverlay}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              <ShoppingCart className="h-6 w-6 inline mr-2 text-primary" />{" "}
              Purchase Not Enabled
            </DialogTitle>
            <DialogDescription className="sr-only">
              A notification that purchasing is not enabled for this image.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-lg text-muted-foreground">
              Purchase is not enabled for this image.
            </p>
            <p className="mt-2 text-sm">
              Please contact me for possibilities regarding prints or digital
              downloads.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <Button onClick={() => setShowPurchaseDisabledOverlay(false)}>
              Got It
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
