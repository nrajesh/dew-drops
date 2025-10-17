import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { showSuccess, showError, showLoading, updateToastSuccess, updateToastError } from "@/utils/toast";
import JSZip from 'jszip';
import { normalizeTag } from "@/lib/utils"; // Import normalizeTag

export const fetchImages = async (): Promise<GalleryImage[]> => {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showError("Failed to fetch images.");
    console.error(error);
    return [];
  }
  return data as GalleryImage[];
};

export const updateImageAltText = async (imageId: string, altText: string): Promise<boolean> => {
  const toastId = showLoading("Updating alt text...");
  const { error } = await supabase
    .from("gallery_images")
    .update({ alt_text: altText })
    .eq("id", imageId);

  if (error) {
    updateToastError(toastId, `Update failed: ${error.message}`);
    return false;
  } else {
    updateToastSuccess(toastId, "Alt text updated successfully!");
    return true;
  }
};

export const handleDelete = async (imageIds: string[], allImages: GalleryImage[]): Promise<boolean> => {
  const toastId = showLoading(`Deleting ${imageIds.length} image(s)...`);
  try {
    const imagesToDelete = allImages.filter(img => imageIds.includes(img.id));
    const fileNamesToDelete = imagesToDelete.map(img => img.file_name);

    if (fileNamesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("gallery")
        .remove(fileNamesToDelete);

      if (storageError && storageError.message !== 'The resource was not found') {
        throw new Error(`Storage error: ${storageError.message}`);
      }
    }

    const { error: dbError } = await supabase
      .from("gallery_images")
      .delete()
      .in("id", imageIds);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    updateToastError(toastId, `${imageIds.length} image(s) deleted successfully.`);
    return true;
  } catch (error: any) {
    updateToastError(toastId, error.message);
    return false;
  }
};

export const handleBulkPublish = async (imageIds: Set<string>, publishStatus: boolean): Promise<boolean> => {
  const toastId = showLoading(`${publishStatus ? "Publishing" : "Unpublishing"} ${imageIds.size} image(s)...`);
  try {
    const { error } = await supabase
      .from("gallery_images")
      .update({ published: publishStatus })
      .in("id", Array.from(imageIds));

    if (error) throw error;

    updateToastSuccess(toastId, `${imageIds.size} image(s) ${publishStatus ? "published" : "unpublished"} successfully.`);
    return true;
  } catch (error: any) {
    updateToastError(toastId, `Failed to update status: ${error.message}`);
    return false;
  }
};

export const handleGenerateTags = async (imageIds: Set<string>, allImages: GalleryImage[]): Promise<number> => {
  const toastId = showLoading(`Generating tags for ${imageIds.size} image(s)...`);
  const imagesToProcess = allImages.filter(img => imageIds.has(img.id));
  let successCount = 0;
  let errorCount = 0;

  for (const image of imagesToProcess) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-tags', {
        body: { fileName: image.file_name },
      });

      if (error) throw error;

      const { tags } = data;
      if (tags && Array.isArray(tags)) {
        const normalizedTags = tags.map(normalizeTag); // Apply normalization here
        const { error: updateError } = await supabase
          .from('gallery_images')
          .update({ tags: normalizedTags })
          .eq('id', image.id);

        if (updateError) throw updateError;
        successCount++;
      }
    } catch (e: any) {
      console.error(`Failed to generate tags for ${image.file_name}:`, e);
      errorCount++;
    }
  }

  if (successCount > 0 && errorCount > 0) {
    updateToastError(toastId, `Generated tags for ${successCount} images, but ${errorCount} failed.`);
  } else if (successCount > 0) {
    updateToastSuccess(toastId, `${successCount} image(s) updated with new tags.`);
  } else if (errorCount > 0) {
    updateToastError(toastId, `${errorCount} image(s) failed to process.`);
  } else {
    showError("No images were processed.");
  }
  return successCount;
};

export const handleBulkDownload = async (imageIds: Set<string>, allImages: GalleryImage[]): Promise<void> => {
  if (imageIds.size === 0) {
    showError("No images selected for download.");
    return;
  }

  const toastId = showLoading(`Preparing ${imageIds.size} image(s) for download...`);
  try {
    const zip = new JSZip();
    const imagesToDownload = allImages.filter(img => imageIds.has(img.id));
    const metadata = [];

    const downloadPromises = imagesToDownload.map(async (image) => {
      const { data: blob, error } = await supabase.storage.from('gallery').download(image.file_name);

      if (error) throw new Error(`Failed to download ${image.file_name}: ${error.message}`);
      
      if (blob) {
        const originalFileName = image.file_name.split('/').pop()?.split('_').slice(1).join('_') || image.file_name;
        zip.file(originalFileName, blob);
        metadata.push({
          fileName: originalFileName,
          alt_text: image.alt_text,
          tags: image.tags ? image.tags.map(normalizeTag) : [], // Normalize tags for metadata export
        });
      }
    });

    await Promise.all(downloadPromises);

    zip.file("metadata.json", JSON.stringify(metadata, null, 2));
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `gallery-export-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    updateToastSuccess(toastId, `${imagesToDownload.length} image(s) and metadata downloaded successfully.`);
  } catch (error: any) {
    updateToastError(toastId, `Download failed: ${error.message}`);
  }
};