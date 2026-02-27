import type { GalleryImage } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Edit, Image as ImageIcon, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

interface ImageListItemProps {
  image: GalleryImage;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTogglePublish: (image: GalleryImage) => void;
  onEdit: (image: GalleryImage) => void;
  onView: (image: GalleryImage) => void;
  isBulkActionMode: boolean;
  isPublished: boolean;
}

export const ImageListItem = ({ image, isSelected, onSelect, onTogglePublish, onEdit, onView, isBulkActionMode, isPublished }: ImageListItemProps) => {
  const readableFileName = image.file_name.split('/').pop()?.split('_').slice(1).join('_') || image.file_name;

  const thumbnailUrl = (() => {
    if (image.image_url) return image.image_url;
    try {
      const { data } = supabase.storage.from('gallery').getPublicUrl(image.file_name);
      return data.publicUrl;
    } catch {
      return null;
    }
  })();

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border gap-3 min-h-[56px]">
      <div className="flex items-center gap-3 flex-grow min-w-0">
        <Checkbox
          id={`select-${image.id}`}
          checked={isSelected}
          onCheckedChange={() => onSelect(image.id)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />
        {/* Thumbnail */}
        <div
          className={`shrink-0 h-10 w-14 rounded overflow-hidden bg-muted flex items-center justify-center ${!isBulkActionMode ? 'cursor-pointer' : ''}`}
          onClick={() => !isBulkActionMode && onView(image)}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={image.alt_text ?? readableFileName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div
          className={`flex flex-col min-w-0 ${isBulkActionMode ? 'cursor-default' : 'cursor-pointer'}`}
          onClick={() => !isBulkActionMode && onView(image)}
        >
          <label htmlFor={`select-${image.id}`} className="font-medium truncate cursor-pointer text-sm leading-snug">{readableFileName}</label>
          <p className="text-xs text-muted-foreground truncate">{image.alt_text || 'No alt text'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isPublished ? (
          <Switch
            checked={image.published}
            onCheckedChange={() => onTogglePublish(image)}
            aria-label="Publish status"
            disabled={isBulkActionMode}
          />
        ) : (
          <Button variant="outline" size="sm" onClick={() => onTogglePublish(image)} disabled={isBulkActionMode}>Publish</Button>
        )}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(image)} aria-label="Edit metadata">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onView(image)} aria-label="View image">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};