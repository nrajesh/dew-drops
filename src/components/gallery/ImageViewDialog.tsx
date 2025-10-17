import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { GalleryImage } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { generateAltTextFromFileName } from '@/lib/utils';

interface ImageViewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  image: GalleryImage;
}

export const ImageViewDialog: React.FC<ImageViewDialogProps> = ({
  isOpen,
  onOpenChange,
  image,
}) => {
  const imageUrl = supabase.storage.from('gallery').getPublicUrl(image.file_name).data.publicUrl;
  const displayAltText = image.alt_text || generateAltTextFromFileName(image.file_name);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{displayAltText}</DialogTitle>
          <DialogDescription>
            {image.tags && image.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 text-sm">
                {image.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 pt-0 flex justify-center items-center max-h-[70vh]">
          <img src={imageUrl} alt={displayAltText} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      </DialogContent>
    </Dialog>
  );
};