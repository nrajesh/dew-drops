import React, { useEffect, useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag } from 'lucide-react';

interface ImageLightboxProps {
  image: GalleryImage | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasNext: boolean;
  hasPrev: boolean;
  onUpdate: () => void; // Callback to refresh gallery data after deletion/update
}

// Helper component to display selected EXIF data
const ExifDataDisplay: React.FC<{ exifData: GalleryImage['exif_data'] }> = ({ exifData }) => {
  if (!exifData || Object.keys(exifData).length === 0) {
    return <p className="text-muted-foreground">No EXIF data found for this image.</p>;
  }

  // Define the keys we want to extract and their display names
  const desiredKeys = [
    { path: ['Make'], label: 'Camera Make' },
    { path: ['Model'], label: 'Camera Model' },
    { path: ['ExposureTime'], label: 'Shutter Speed' },
    { path: ['FNumber'], label: 'Aperture' },
    { path: ['FocalLength'], label: 'Focal Length' },
    { path: ['ISO'], label: 'ISO' },
  ];

  // Function to safely get a value from the nested exifData object
  const getValue = (data: any, path: string[]): string | null => {
    let current = data;
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }
    return current !== null && current !== undefined ? String(current) : null;
  };

  const exifDetails = desiredKeys.map(item => {
    let value = getValue(exifData, item.path);
    
    // Simple formatting for common fields
    if (item.label === 'Aperture' && value) {
      value = `f/${value}`;
    } else if (item.label === 'Focal Length' && value) {
      value = `${value}mm`;
    } else if (item.label === 'ISO' && value) {
      value = `ISO ${value}`;
    }

    return {
      label: item.label,
      value: value,
    };
  }).filter(item => item.value !== null);

  if (exifDetails.length === 0) {
    return <p className="text-muted-foreground">No relevant photographic data found in EXIF.</p>;
  }

  return (
    <ScrollArea className="h-96 p-4 border rounded-md">
      <dl className="space-y-3">
        {exifDetails.map((detail, index) => (
          <div key={index} className="flex justify-between items-center border-b pb-2 last:border-b-0">
            <dt className="text-sm font-medium text-muted-foreground">{detail.label}</dt>
            <dd className="text-sm font-semibold text-right">{detail.value}</dd>
          </div>
        ))}
      </dl>
    </ScrollArea>
  );
};


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
  const [showExif, setShowExif] = useState(false);

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

  const handleShowExif = () => {
    setShowExif(true);
  };
  
  // Removed handleDownload function

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
    <>
      <Dialog open={!!image} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none">
          <div className="relative flex items-center justify-center h-[80vh]">
            
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
              <Button variant="secondary" size="sm" onClick={handleShowExif}>
                <Info className="h-4 w-4 mr-2" /> EXIF Data
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

      {/* EXIF Data Dialog */}
      <Dialog open={showExif} onOpenChange={setShowExif}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" /> EXIF Data for {image?.file_name || 'Image'}
            </DialogTitle>
          </DialogHeader>
          <ExifDataDisplay exifData={image?.exif_data} />
        </DialogContent>
      </Dialog>
    </>
  );
};