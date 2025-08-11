import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import type { GalleryImage } from "@/types";

interface ImageLightboxProps {
  image: GalleryImage | null;
  onClose: () => void;
}

const backdropVariants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const modalVariants = {
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

export const ImageLightbox = ({ image, onClose }: ImageLightboxProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={onClose}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image
            variants={modalVariants}
          >
            <img
              src={image.image_url}
              alt={image.alt_text || "Enlarged gallery image"}
              className="w-full h-auto object-contain max-h-[90vh] rounded-lg shadow-2xl"
            />
          </motion.div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Close image view"
          >
            <X size={32} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};