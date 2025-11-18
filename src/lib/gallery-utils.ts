import { supabase } from '@/integrations/supabase/client';
import type { GalleryImage } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const generateTagsForImage = async (image: GalleryImage) => {
  try {
    // The image URL might point to a non-public object, which the Edge Function can't access.
    // We create a temporary signed URL to grant access for tag generation.
    const url = new URL(image.image_url);
    // Extract the path from a URL like: .../storage/v1/object/public/gallery/image.jpg
    const path = url.pathname.substring(url.pathname.indexOf('/gallery/') + '/gallery/'.length);

    if (!path) {
      throw new Error("Could not determine the image path from the URL.");
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('gallery')
      .createSignedUrl(path, 60); // URL is valid for 60 seconds

    if (signedUrlError) {
      throw signedUrlError;
    }

    const { data, error } = await supabase.functions.invoke('generate-tags', {
      body: { imageUrl: signedUrlData.signedUrl, imageId: image.id },
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