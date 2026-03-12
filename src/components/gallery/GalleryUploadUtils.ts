import type { GalleryImage } from "@/types";
import {
  updateToastError,
  updateToastLoading,
  updateToastSuccess,
} from "@/utils/toast";
import { normalizeTag, sanitizeFileName } from "@/lib/utils";
import ExifReader from "exifreader";

// Helper to sanitize objects for JSON serialization
const sanitizeForJson = (obj: unknown) => {
  const seen = new WeakSet();
  const replacer = (_key: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    if (typeof value === "string") {
      // eslint-disable-next-line no-control-regex
      return value.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
    }
    return value;
  };

  try {
    return JSON.parse(JSON.stringify(obj, replacer));
  } catch (e) {
    console.error("Failed to sanitize object for JSON", e);
    return {};
  }
};

interface ProcessImageUploadsResult {
  successfulUploads: number;
  totalImageFiles: number;
  failedFiles: { fileName: string; error: string }[];
}

/**
 * Simulates processing and uploads image files.
 */
export const processImageUploads = async (
  imageFiles: File[],
  metadataMap: Map<string, { alt_text: string; tags: string[] }>,
  userId: string,
  toastId: string | number,
): Promise<ProcessImageUploadsResult> => {
  let successfulUploads = 0;
  const failedFiles: { fileName: string; error: string }[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    updateToastLoading(
      toastId,
      `Uploading ${i + 1} of ${imageFiles.length}: ${file.name} (Simulation)`,
    );
    try {
      // Simulation delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      let exifData = {};
      try {
        const rawExif = await ExifReader.load(file);
        delete rawExif["MakerNote"];
        delete rawExif["UserComment"];
        if (rawExif.thumbnail) delete rawExif.thumbnail;
        exifData = sanitizeForJson(rawExif);
      } catch (exifError: unknown) {
        console.warn(`Could not read EXIF data for ${file.name}.`);
      }

      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${userId}/${Date.now()}_${sanitizedName}`;
      const metadata = metadataMap.get(file.name);

      console.log("Simulating gallery upload:", fileName, {
        userId,
        alt_text: metadata?.alt_text,
        tags: metadata?.tags ? metadata.tags.map(normalizeTag) : undefined,
        exifData,
      });

      successfulUploads++;
    } catch (error: unknown) {
      const err = error as Error;
      failedFiles.push({ fileName: file.name, error: err.message });
      updateToastError(
        toastId,
        `Failed to upload ${file.name}: ${err.message}`,
      );
    }
  }

  updateToastSuccess(
    toastId,
    `Successfully processed ${successfulUploads} uploads (Simulated).`,
  );
  return { successfulUploads, totalImageFiles: imageFiles.length, failedFiles };
};

interface ProcessMetadataUpdateResult {
  updatedCount: number;
  notFoundCount: number;
  failedUpdates: { fileName: string; error: string }[];
}

/**
 * Simulates processing a metadata JSON file to update existing gallery images.
 */
export const processMetadataUpdate = async (
  metadataFile: File,
  allImages: GalleryImage[],
  toastId: string | number,
): Promise<ProcessMetadataUpdateResult> => {
  let updatedCount = 0;
  let notFoundCount = 0;
  const failedUpdates: { fileName: string; error: string }[] = [];

  updateToastLoading(
    toastId,
    `Applying metadata from ${metadataFile.name} (Simulation)...`,
  );

  try {
    const metadataContent = await metadataFile.text();
    const metadataArray = JSON.parse(metadataContent);

    if (!Array.isArray(metadataArray)) {
      throw new Error("Metadata JSON is not a valid array.");
    }

    // Simulation delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    for (const meta of metadataArray) {
      if (typeof meta.file_name !== "string" || !meta.file_name) continue;
      const sanitizedMetaFileName = sanitizeFileName(meta.file_name);
      const existingImage = allImages.find((img) =>
        img.file_name.endsWith(`_${sanitizedMetaFileName}`),
      );

      if (existingImage) {
        console.log("Simulating metadata update for:", meta.file_name);
        updatedCount++;
      } else {
        notFoundCount++;
      }
    }

    updateToastSuccess(
      toastId,
      `Metadata update simulated for ${updatedCount} images.`,
    );
  } catch (e: unknown) {
    const err = e as Error;
    failedUpdates.push({ fileName: metadataFile.name, error: err.message });
    throw new Error(`Failed to simulate metadata update: ${err.message}`);
  }

  return { updatedCount, notFoundCount, failedUpdates };
};
