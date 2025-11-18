import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { showSuccess, showError, showLoading, updateToastSuccess, updateToastError, updateToastLoading } from "@/utils/toast";
import JSZip from 'jszip';
import { normalizeTag, sanitizeFileName } from "@/lib/utils"; // Import normalizeTag
import ExifReader from 'exifreader';

// Helper to sanitize objects for JSON serialization, removing circular references and invalid characters
const sanitizeForJson = (obj: any) => {
  const seen = new WeakSet();
  const replacer = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return; // Circular reference found, discard key
      }
      seen.add(value);
    }
    if (typeof value === 'string') {
      // Remove null characters and other non-printable control characters that can break JSON parsing
      // eslint-disable-next-line no-control-regex
      return value.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
    }
    return value;
  };

  try {
    // Stringify with the replacer and then parse back to get a clean object
    return JSON.parse(JSON.stringify(obj, replacer));
  } catch (e) {
    console.error("Failed to sanitize object for JSON, returning empty object.", e);
    return {};
  }
};

interface ProcessImageUploadsResult {
  successfulUploads: number;
  totalImageFiles: number;
  failedFiles: { fileName: string; error: string }[];
}

/**
 * Processes and uploads image files to Supabase Storage and inserts their metadata into the database.
 * Optionally applies metadata from a JSON file.
 */
export const processImageUploads = async (
  imageFiles: File[],
  metadataMap: Map<string, { alt_text: string; tags: string[] }>,
  userId: string,
  toastId: string | number
): Promise<ProcessImageUploadsResult> => {
  let successfulUploads = 0;
  const failedFiles: { fileName: string; error: string }[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    updateToastLoading(toastId, `Uploading ${i + 1} of ${imageFiles.length}: ${file.name}`);
    try {
      let exifData = {};
      try {
        const rawExif = await ExifReader.load(file);
        delete rawExif['MakerNote'];
        delete rawExif['UserComment'];
        if (rawExif.thumbnail) delete rawExif.thumbnail;
        exifData = sanitizeForJson(rawExif);
      } catch (exifError: any) {
        console.warn(`Could not read EXIF data for ${file.name}: ${exifError.message}. Proceeding without it.`);
      }

      // No more compression. Upload the original file to preserve all metadata.
      const fileToUpload: File = file;
      
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${userId}/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage.from('gallery').upload(fileName, fileToUpload);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName);
      const metadata = metadataMap.get(file.name);

      const { error: dbError } = await supabase.from('gallery_images').insert({
        user_id: userId,
        file_name: fileName,
        image_url: publicUrl,
        published: false,
        alt_text: metadata?.alt_text,
        tags: metadata?.tags ? metadata.tags.map(normalizeTag) : undefined, // Apply normalization here
        exif_data: exifData,
      });
      if (dbError) throw dbError;
      successfulUploads++;
    } catch (error: any) {
      failedFiles.push({ fileName: file.name, error: error.message });
      updateToastError(toastId, `Failed to upload ${file.name}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Pause for user to read toast
    }
  }
  return { successfulUploads, totalImageFiles: imageFiles.length, failedFiles };
};

interface ProcessMetadataUpdateResult {
  updatedCount: number;
  notFoundCount: number;
  failedUpdates: { fileName: string; error: string }[];
}

/**
 * Processes a metadata JSON file to update existing gallery images in the database.
 */
export const processMetadataUpdate = async (
  metadataFile: File,
  allImages: GalleryImage[],
  toastId: string | number
): Promise<ProcessMetadataUpdateResult> => {
  let updatedCount = 0;
  let notFoundCount = 0;
  const failedUpdates: { fileName: string; error: string }[] = [];

  updateToastLoading(toastId, `Applying metadata from ${metadataFile.name}...`);

  try {
    const metadataContent = await metadataFile.text();
    const metadataArray = JSON.parse(metadataContent);

    if (!Array.isArray(metadataArray)) {
      throw new Error("Metadata JSON is not a valid array.");
    }

    const updatePromises = metadataArray.map(async (meta: any) => {
      if (!meta.file_name) return;
      const sanitizedMetaFileName = sanitizeFileName(meta.file_name);
      const existingImage = allImages.find(img => img.file_name.endsWith(`_${sanitizedMetaFileName}`));

      if (existingImage) {
        const updatePayload: { alt_text?: string; tags?: string[]; purchase_link?: string | null } = {};
        if (typeof meta.alt_text === 'string') updatePayload.alt_text = meta.alt_text;
        if (Array.isArray(meta.tags)) updatePayload.tags = meta.tags.map(normalizeTag);
        if (typeof meta.purchase_link === 'string') updatePayload.purchase_link = meta.purchase_link || null;

        if (Object.keys(updatePayload).length > 0) {
          const { error } = await supabase.from('gallery_images').update(updatePayload).eq('id', existingImage.id);
          if (error) {
            failedUpdates.push({ fileName: meta.file_name, error: error.message });
            console.error(`Failed to update ${meta.file_name}:`, error);
          } else {
            updatedCount++;
          }
        }
      } else {
        notFoundCount++;
      }
    });

    await Promise.all(updatePromises);

  } catch (e: any) {
    failedUpdates.push({ fileName: metadataFile.name, error: e.message });
    throw new Error(`Failed to parse or process metadata file: ${e.message}`);
  }

  return { updatedCount, notFoundCount, failedUpdates };
};