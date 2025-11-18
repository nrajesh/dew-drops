import { supabase } from '@/integrations/supabase/client';
import type { GalleryImage } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { normalizeTag } from '@/lib/utils';

export const generateTagsForImage = async (image: GalleryImage) => {
  try {
    // Use the more robust 'generate-image-tags' function which takes fileName
    // and uses the service role key to download, avoiding signed URL complexities.
    const { data, error } = await supabase.functions.invoke('generate-image-tags', {
      body: { fileName: image.file_name },
    });

    if (error) throw error;
    if (data.error) throw new Error(data.error);

    const { tags } = data;
    if (tags && Array.isArray(tags)) {
      // The function already normalizes, but we do it here for client-side consistency
      const normalizedTags = tags.map(normalizeTag);
      const { error: updateError } = await supabase
        .from('gallery_images')
        .update({ tags: normalizedTags })
        .eq('id', image.id);

      if (updateError) throw updateError;
    }

    showSuccess(`Tags generated for ${image.file_name}`);
  } catch (error: any) {
    showError(`Failed to generate tags for ${image.file_name}: ${error.message}`);
  }
};

export const downloadImagesAsZip = async (images: GalleryImage[]) => {
  const zip = new JSZip();
  
  const imagePromises = images.map(async (image) => {
    if (image.image_url) {
      try {
        const response = await fetch(image.image_url);
        if (!response.ok) {
          console.error(`Failed to fetch image: ${image.file_name}`);
          return;
        }
        const blob = await response.blob();
        zip.file(image.file_name, blob);
      } catch (error) {
        console.error(`Error downloading image ${image.file_name}:`, error);
      }
    }
  });

  await Promise.all(imagePromises);

  zip.generateAsync({ type: 'blob' }).then((content) => {
    saveAs(content, 'gallery-images.zip');
  });
};