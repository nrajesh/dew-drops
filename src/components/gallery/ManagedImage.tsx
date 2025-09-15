import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryImage } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface ManagedImageProps {
  image: GalleryImage;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTogglePublish: (image: GalleryImage) => void;
  onEdit: (image: GalleryImage) => void;
}

export const ManagedImage = ({ image, isSelected, onSelect, onTogglePublish, onEdit }: ManagedImageProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const generateUrl = async () => {
      // Always start fresh
      if (isMounted) setImageUrl(null);

      if (image.published) {
        const { data } = supabase.storage.from('gallery').getPublicUrl(image.file_name, {
          transform: {
            width: 200,
            height: 200,
            resize: 'cover',
          },
        });
        
        // The cache key from the parent component ensures this effect re-runs on status change.
        // The timestamp here ensures the URL is unique, busting any CDN cache.
        const finalUrl = `${data.publicUrl}?t=${image._cacheKey || new Date().getTime()}`;

        if (isMounted) {
          setImageUrl(finalUrl);
        }
      } else {
        // For unpublished images, generate a temporary signed URL to view them securely.
        const { data, error } = await supabase.storage
          .from('gallery')
          .createSignedUrl(image.file_name, 60 * 5, { // 5-minute expiry
            transform: {
              width: 200,
              height: 200,
              resize: 'cover',
            },
          });

        if (isMounted) {
          if (error) {
            console.error('Error generating signed URL:', error);
          } else {
            setImageUrl(data.signedUrl);
          }
        }
      }
    };

    generateUrl();

    return () => {
      isMounted = false;
    };
  }, [image.file_name, image.published, image._cacheKey]);

  return (
    <Card className="flex flex-col">
      <CardContent className="p-0">
        <AspectRatio ratio={1}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={image.alt_text || "Gallery image"}
              className="rounded-t-lg object-cover w-full h-full"
            />
          ) : (
            <Skeleton className="w-full h-full rounded-t-lg" />
          )}
        </AspectRatio>
      </CardContent>
      <CardFooter className="p-2 flex-col items-start flex-grow justify-between">
        <p className="text-xs text-muted-foreground truncate w-full h-8">
          {image.alt_text}
        </p>
        <div className="flex justify-between w-full items-center mt-1">
          <Checkbox
            id={`select-${image.id}`}
            checked={isSelected}
            onCheckedChange={() => onSelect(image.id)}
          />
          <div className="flex gap-1 items-center">
            <Switch
              checked={image.published}
              onCheckedChange={() => onTogglePublish(image)}
              aria-label="Publish status"
            />
            <Button variant="ghost" size="sm" onClick={() => onEdit(image)}>
              <Edit className="h-3 w-3 mr-1" /> Edit
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};