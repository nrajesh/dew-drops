import { motion, AnimatePresence, Variants } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useEffect, useState } from "react";
import type { GalleryImage } from "@/types";
import { CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageLightboxProps {
  image: GalleryImage | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasNext: boolean;
  hasPrev: boolean;
}

const backdropVariants: Variants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    transition: { type: "spring", damping: 25, stiffness: 200 },
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", damping: 20, stiffness: 150 },
  },
};

const ExifDisplay = ({ data }: { data: Record<string, any> }) => {
    const relevantTags = {
        Make: 'Camera Make',
        Model: 'Camera Model',
        DateTimeOriginal: 'Date Taken',
        FNumber: 'F-stop',
        ExposureTime: 'Exposure Time',
        ISOSpeedRatings: 'ISO',
        FocalLength: 'Focal Length',
        LensModel: 'Lens Model',
    };

    const entries = Object.entries(relevantTags)
        .map(([key, label]) => {
            const value = data[key];
            return value ? { label, value } : null;
        })
        .filter((item): item is { label: string; value: any } => item !== null);

    if (entries.length === 0) {
        return <p className="text-center text-muted-foreground">No common EXIF data found.</p>;
    }

    return (
        <ul className="space-y-2 text-sm font-mono">
            {entries.map(entry => (
                <li key={entry.label} className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-muted-foreground">{entry.label}</span>
                    <span className="font-semibold text-right text-foreground">{String(entry.value)}</span>
                </li>
            ))}
        </ul>
    );
};

export const ImageLightbox = ({ image, onClose, onNavigate, hasNext, hasPrev }: ImageLightboxProps) => {
  const [showExif, setShowExif] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [altText, setAltText] = useState(image?.alt_text || "");
  const { session } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showExif) {
          setShowExif(false);
        } else {
          onClose();
        }
      } else if (!showExif && e.key === "ArrowRight" && hasNext) {
        onNavigate('next');
      } else if (!showExif && e.key === "ArrowLeft" && hasPrev) {
        onNavigate('prev');
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onNavigate, hasNext, hasPrev, showExif]);

  // Reset EXIF view when image changes
  useEffect(() => {
    setShowExif(false);
    setAltText(image?.alt_text || "");
  }, [image]);

  const exifData = image?.exif_data;
  const captionText = image?.alt_text;
  const showCaption = captionText && !/\.(jpe?g|png|tiff|gif)$/i.test(captionText);

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && hasNext) {
      onNavigate('next');
    }
    if (isRightSwipe && hasPrev) {
      onNavigate('prev');
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleAltTextUpdate = async () => {
    if (!image || !session) return;

    const toastId = showLoading("Updating alt text...");
    const { error } = await supabase
      .from("gallery_images")
      .update({ alt_text: altText })
      .eq("id", image.id);

    dismissToast(toastId);
    if (error) {
      showError(`Update failed: ${error.message}`);
    } else {
      showSuccess("Alt text updated successfully!");
    }
  };

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 group"
          onClick={onClose}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          transition={{ duration: 0.3 }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Navigation and Close Buttons */}
          {hasPrev && (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2 opacity-0 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft size={32} />
            </button>
          )}
          {hasNext && (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate('next'); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2 opacity-0 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight size={32} />
            </button>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-20"
            aria-label="Close image view"
          >
            <X size={32} />
          </button>

          {/* EXIF Info Button */}
          {exifData && Object.keys(exifData).length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowExif(true); }}
              className="absolute top-4 left-4 text-white/80 hover:text-white transition-colors z-20"
              aria-label="Show EXIF data"
            >
              <Info size={24} />
            </button>
          )}

          {/* Main Image and Description */}
          <motion.div
            className="relative max-w-4xl w-full flex flex-col items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
            key={image.id}
          >
            <img
              src={image.image_url}
              alt={image.alt_text || "Enlarged gallery image"}
              className="w-full h-auto object-contain max-h-[85vh] rounded-lg shadow-2xl"
            />
            {session && (
              <div className="w-full mt-4 p-4 bg-background/80 rounded-lg">
                <div className="flex flex-col gap-2">
                  <Textarea
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Enter alt text for this image"
                    className="w-full"
                  />
                  <Button onClick={handleAltTextUpdate} className="self-end">
                    Update Alt Text
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {/* EXIF Overlay */}
          <AnimatePresence>
            {showExif && exifData && (
              <motion.div
                className="absolute inset-0 z-30 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { e.stopPropagation(); setShowExif(false); }}
              >
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                <motion.div
                  className="relative bg-card rounded-lg shadow-xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto"
                  variants={modalVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <CardHeader className="p-0 mb-4">
                    <CardTitle>EXIF Data</CardTitle>
                    <CardDescription>Technical details from the image file.</CardDescription>
                  </CardHeader>
                  <button
                    onClick={() => setShowExif(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                    aria-label="Close EXIF data"
                  >
                    <X size={20} />
                  </button>
                  <ExifDisplay data={exifData} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};