import { motion, AnimatePresence, Variants } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Info, Camera, Calendar, MapPin, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import type { GalleryImage } from "@/types";
import { CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { updateImageAltText } from "./gallery/GalleryManagementUtils";
import { generateAltTextFromFileName } from "@/lib/utils"; // Import utility function

interface ImageLightboxProps {
  image: GalleryImage | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasNext: boolean;
  hasPrev: boolean;
  onUpdate: () => void; // Callback to refresh gallery data
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
    Make: { label: 'Camera Make', icon: <Camera className="h-4 w-4" /> },
    Model: { label: 'Camera Model', icon: <Camera className="h-4 w-4" /> },
    DateTimeOriginal: { label: 'Date Taken', icon: <Calendar className="h-4 w-4" /> },
    FNumber: { label: 'F-stop', icon: <Settings className="h-4 w-4" /> },
    ExposureTime: { label: 'Exposure Time', icon: <Settings className="h-4 w-4" /> },
    ISOSpeedRatings: { label: 'ISO', icon: <Settings className="h-4 w-4" /> },
    FocalLength: { label: 'Focal Length', icon: <Settings className="h-4 w-4" /> },
    LensModel: { label: 'Lens Model', icon: <Settings className="h-4 w-4" /> },
    GPSLatitude: { label: 'Latitude', icon: <MapPin className="h-4 w-4" /> },
    GPSLongitude: { label: 'Longitude', icon: <MapPin className="h-4 w-4" /> },
  };

  const entries = Object.entries(relevantTags)
    .map(([key, { label, icon }]) => {
      const exifTag = data[key];
      if (!exifTag) return null;

      const value = (typeof exifTag === 'object' && exifTag.description) ? exifTag.description : exifTag;
      
      return { label, value, icon };
    })
    .filter((item): item is { label: string; value: any; icon: JSX.Element } => item !== null);

  if (entries.length === 0) {
    return <p className="text-center text-muted-foreground">No common EXIF data found.</p>;
  }

  return (
    <ul className="space-y-2 text-sm font-mono">
      {entries.map(entry => (
        <li key={entry.label} className="flex justify-between items-center border-b border-border pb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {entry.icon}
            <span>{entry.label}</span>
          </div>
          <span className="font-semibold text-right text-foreground">{String(entry.value)}</span>
        </li>
      ))}
    </ul>
  );
};

export const ImageLightbox = ({ image, onClose, onNavigate, hasNext, hasPrev, onUpdate }: ImageLightboxProps) => {
  const [showExif, setShowExif] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [altText, setAltText] = useState(image?.alt_text || "");
  const { session } = useAuth();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    if (controlsVisible) {
      const timer = setTimeout(() => setControlsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [controlsVisible, image]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showExif) setShowExif(false);
        else onClose();
      } else if (!showExif && e.key === "ArrowRight" && hasNext) onNavigate('next');
      else if (!showExif && e.key === "ArrowLeft" && hasPrev) onNavigate('prev');
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNavigate, hasNext, hasPrev, showExif]);

  useEffect(() => {
    setShowExif(false);
    setAltText(image?.alt_text || "");
    setControlsVisible(true);
  }, [image]);

  const captionText = image?.alt_text || generateAltTextFromFileName(image?.file_name || "");
  const showCaption = captionText && !/\.(jpe?g|png|tiff|gif)$/i.test(captionText);

  const handleAltTextUpdate = async () => {
    if (!image || !session) return;
    if (await updateImageAltText(image.id, altText)) onUpdate();
  };

  const toggleControls = (e: React.MouseEvent) => {
    e.stopPropagation();
    setControlsVisible(prev => !prev);
  };

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && hasNext) onNavigate('next');
    if (distance < -minSwipeDistance && hasPrev) onNavigate('prev');
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={onClose}
          initial="hidden" animate="visible" exit="hidden"
          variants={backdropVariants} transition={{ duration: 0.3 }}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          <motion.div
            className="relative max-w-4xl w-full flex flex-col items-center gap-2"
            onClick={toggleControls}
            variants={modalVariants}
            key={image.id}
          >
            <AnimatePresence>
              {controlsVisible && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {hasPrev && (
                    <button onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2" aria-label="Previous image"><ChevronLeft size={32} /></button>
                  )}
                  {hasNext && (
                    <button onClick={(e) => { e.stopPropagation(); onNavigate('next'); }} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2" aria-label="Next image"><ChevronRight size={32} /></button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-20" aria-label="Close image view"><X size={32} /></button>
                  {image.exif_data && Object.keys(image.exif_data).length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setShowExif(true); }} className="absolute top-4 left-4 text-white/80 hover:text-white transition-colors z-20" aria-label="Show EXIF data"><Info size={24} /></button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <img src={image.image_url} alt={image.alt_text || "Enlarged gallery image"} className="w-full h-auto object-contain max-h-[85vh] rounded-lg shadow-2xl cursor-pointer" />
            
            {showCaption && <p className="mt-2 text-white/80 text-center text-sm max-w-[80%]">{captionText}</p>}
            
            {session && (
              <div className="w-full mt-4 p-4 bg-background/80 rounded-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col gap-2">
                  <Textarea value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Enter alt text for this image" className="w-full" />
                  <Button onClick={handleAltTextUpdate} className="self-end">Update Alt Text</Button>
                </div>
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {showExif && image.exif_data && (
              <motion.div className="absolute inset-0 z-30 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { e.stopPropagation(); setShowExif(false); }}>
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                <motion.div className="relative bg-card rounded-lg shadow-xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto" variants={modalVariants} initial="hidden" animate="visible" exit="hidden">
                  <CardHeader className="p-0 mb-4"><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />EXIF Data</CardTitle><CardDescription>Technical details from the image file.</CardDescription></CardHeader>
                  <button onClick={() => setShowExif(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" aria-label="Close EXIF data"><X size={20} /></button>
                  <ExifDisplay data={image.exif_data} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageLightbox;