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

/** Strip the user-id prefix and timestamp from a stored file name to get a human-readable label. */
const readableLabel = (fileName: string) =>
  fileName.split('/').pop()?.split('_').slice(2).join('_') ||
  fileName.split('/').pop() ||
  fileName;

export const ImageListItem = ({
  image,
  isSelected,
  onSelect,
  onTogglePublish,
  onEdit,
  onView,
  isBulkActionMode,
  isPublished,
}: ImageListItemProps) => {
  const label = readableLabel(image.file_name);

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
        {/* Checkbox — only ever selects, never opens lightbox */}
        <Checkbox
          id={`select-${image.id}`}
          checked={isSelected}
          onCheckedChange={() => onSelect(image.id)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />

        {/* Thumbnail — clicking always opens the lightbox */}
        <div
          className="shrink-0 h-10 w-14 rounded overflow-hidden bg-muted flex items-center justify-center cursor-pointer"
          onClick={() => onView(image)}
          title="View image"
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={image.alt_text ?? label}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Text column — NOT clickable; use the Eye button to open lightbox */}
        <div className="flex flex-col min-w-0">
          {/* No htmlFor — clicking the label no longer triggers the checkbox */}
          <span className="font-medium text-sm truncate leading-snug">{label}</span>
          <p className="text-xs text-muted-foreground truncate">
            {image.alt_text || 'No alt text'}
          </p>
          {image.tags && image.tags.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              🏷 {image.tags.slice(0, 4).join(', ')}{image.tags.length > 4 ? ` +${image.tags.length - 4}` : ''}
            </p>
          )}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTogglePublish(image)}
            disabled={isBulkActionMode}
          >
            Publish
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onEdit(image)}
          aria-label="Edit metadata"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onView(image)}
          aria-label="View image"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};