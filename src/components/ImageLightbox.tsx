import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Download, Tag } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface ImageLightboxProps {
  image: GalleryImage | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasNext: boolean;
  hasPrev: boolean;
  onUpdate: () => void; // Callback to refresh gallery data after deletion/update
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  image,
  onClose,
  onNavigate,
  hasNext,
  hasPrev,
  onUpdate,
}) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const getImageUrl = (fileName: string) => {
    const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleDelete = async () => {
    if (!image || !confirm("Are you sure you want to delete this image? This action cannot be undone.")) return;

    const { error: storageError } = await supabase.storage
      .from('gallery')
      .remove([image.file_name]);

    if (storageError) {
      showError(`Failed to delete file from storage: ${storageError.message}`);
      return;
    }

    const { error: dbError } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', image.id);

    if (dbError) {
      showError(`Failed to delete image record: ${dbError.message}`);
      // Note: If DB deletion fails, the file is already gone from storage. Manual cleanup might be needed.
      return;
    }

    showSuccess("Image deleted successfully.");
    onClose();
    onUpdate();
  };

  const handleDownload = () => {
    if (!image) return;
    const url = getImageUrl(image.file_name);
    window.open(url, '_blank');
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!image) return;
    if (e.key === 'ArrowRight' && hasNext) {
      onNavigate('next');
    } else if (e.key === 'ArrowLeft' && hasPrev) {
      onNavigate('prev');
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [image, hasNext, hasPrev, onNavigate, onClose]);

  useEffect(() => {
    if (image) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [image, handleKeyDown]);

  if (!image) return null;

  const imageUrl = getImageUrl(image.file_name);

  return (
    <Dialog open={!!image} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none">
        <div className="relative flex items-center justify-center h-[80vh]">
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-20 text-white hover:bg-black/50"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navigation Buttons */}
          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-10 text-white hover:bg-black/50"
              onClick={() => onNavigate('prev')}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-10 text-white hover:bg-black/50"
              onClick={() => onNavigate('next')}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Image Display */}
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={imageUrl}
              alt={image.alt_text || "Gallery image"}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>

        {/* Metadata and Actions Bar */}
        <div className="bg-black/70 p-4 rounded-b-lg text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col">
            {/* Display alt_text instead of file_name */}
            <p className="text-lg font-semibold">{image.alt_text || "Image Details"}</p>
            
            {/* Tags */}
            {image.tags && image.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                <Tag className="h-4 w-4 mr-2 text-gray-400" />
                {image.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="bg-gray-600 text-white hover:bg-gray-500">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" /> Download
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
  );
};