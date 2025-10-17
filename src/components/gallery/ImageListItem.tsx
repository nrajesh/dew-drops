import type { GalleryImage } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Edit, Image as ImageIcon, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ImageListItemProps {
  image: GalleryImage;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTogglePublish: (image: GalleryImage) => void;
  onEdit: (image: GalleryImage) => void;
  onView: (image: GalleryImage) => void;
  isBulkActionMode: boolean;
  // Removed isPublished prop as it's no longer needed for conditional rendering of the toggle
}

export const ImageListItem = ({ image, isSelected, onSelect, onTogglePublish, onEdit, onView, isBulkActionMode }: ImageListItemProps) => {
  const readableFileName = image.file_name.split('/').pop()?.split('_').slice(1).join('_') || image.file_name;

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border gap-4">
      <div className="flex items-center gap-3 flex-grow min-w-0">
        <Checkbox
          id={`select-${image.id}`}
          checked={isSelected}
          onCheckedChange={() => onSelect(image.id)}
          onClick={(e) => e.stopPropagation()}
        />
        <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className={`flex flex-col min-w-0 ${isBulkActionMode ? 'cursor-default' : 'cursor-pointer'}`} onClick={() => !isBulkActionMode && onView(image)}>
            <label htmlFor={`select-${image.id}`} className="font-medium truncate cursor-pointer">{readableFileName}</label>
            <p className="text-xs text-muted-foreground truncate">{image.alt_text || "No alt text"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Always show the Switch for publish status */}
        <Switch
          checked={image.published}
          onCheckedChange={() => onTogglePublish(image)}
          aria-label="Publish status"
          disabled={isBulkActionMode}
        />
        <Button variant="ghost" size="icon" onClick={() => onEdit(image)} aria-label="Edit metadata" disabled={isBulkActionMode}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onView(image)} aria-label="View image" disabled={isBulkActionMode}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};