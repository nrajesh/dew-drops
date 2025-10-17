"use client";

import React from 'react';
import type { GalleryImage } from '@/types';
import { DialogDescription } from '@/components/ui/dialog';

interface ImagePreviewDialogProps {
  image: GalleryImage;
}

export const ImagePreviewDialog = ({ image }: ImagePreviewDialogProps) => {
  return (
    <div className="space-y-4">
      <DialogDescription>
        Preview of "{image.file_name.split('/').pop()?.split('_').slice(1).join('_') || image.file_name}"
      </DialogDescription>
      {image.image_url ? (
        <img src={image.image_url} alt={image.alt_text || image.file_name} className="max-w-full h-auto rounded-md object-contain" />
      ) : (
        <div className="flex items-center justify-center h-64 bg-muted rounded-md text-muted-foreground">
          No image URL available.
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p><strong>Alt Text:</strong> {image.alt_text || 'N/A'}</p>
        <p><strong>Published:</strong> {image.published ? 'Yes' : 'No'}</p>
        <p><strong>Tags:</strong> {image.tags?.join(', ') || 'N/A'}</p>
        <p><strong>Created At:</strong> {new Date(image.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
};