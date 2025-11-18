import { supabase } from '@/integrations/supabase/client';
import type { GalleryImage } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const generateTagsForImage = async (image: GalleryImage) => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-tags', {
      body: { imageUrl: image.image_url, imageId: image.id },
    });

    if (error) throw error;
    if (data.error) throw new Error(data.error);

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