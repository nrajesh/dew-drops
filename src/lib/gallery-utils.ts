import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getGeminiModel } from "@/integrations/gemini/client";


/**
 * Strips user-id prefix + timestamp from the stored file path to produce a
 * short, human-readable name like "IMG_2807.jpg".
 */
const friendlyName = (fileName: string) =>
  fileName.split("/").pop()?.split("_").slice(2).join("_") ||
  fileName.split("/").pop() ||
  fileName;

export const generateTagsForImage = async (
  image: GalleryImage,
  saveToDb: boolean = true
): Promise<string[]> => {
  const name = friendlyName(image.file_name);
  try {
    const currentModel = getGeminiModel();

    // Download the raw image
    const { data: blob, error: downloadError } = await supabase.storage
      .from("gallery")
      .download(image.file_name);

    if (downloadError) throw downloadError;
    if (!blob) throw new Error("Failed to download image data.");

    // Downscale the image using an HTML Canvas to prevent massive Base64
    // strings from crashing the browser tab or hitting Gemini API limits.
    const base64Data = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxSize = 800; // Procure low-resolution photo

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No 2d context"));
        ctx.drawImage(img, 0, 0, width, height);

        // Export as heavily compressed JPEG
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to process image blob"));
      };
      img.src = objectUrl;
    });

    const prompt =
      "Analyze this image and provide a comma-separated list of 5-10 relevant keywords for search purposes. Only return the keywords, nothing else. Example: 'nature, mountain, lake, sunset, landscape'";

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };

    const result = await currentModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const normalizeTag = (tag: string) => tag.normalize("NFC").trim();
    const tags: string[] = text
      .split(",")
      .map((tag) => normalizeTag(tag.toLowerCase()))
      .filter(Boolean);

    // Optionally update the database record
    if (saveToDb) {
      const { error: updateError } = await supabase
        .from("gallery_images")
        .update({ tags })
        .eq("id", image.id);

      if (updateError) {
        throw new Error(`Failed to update tags in DB: ${updateError.message}`);
      }
    }

    if (tags.length > 0) {
      showSuccess(
        `✅ ${name} — ${tags.length} tags: ${tags.slice(0, 5).join(", ")}${tags.length > 5 ? ` +${tags.length - 5} more` : ""}`,
      );
    } else {
      showSuccess(`✅ ${name} — no tags returned`);
    }

    return tags;
  } catch (error: unknown) {
    const err = error as Error;
    showError(`❌ ${name}: ${err.message}`);
    return [];
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

  zip.generateAsync({ type: "blob" }).then((content) => {
    saveAs(content, "gallery-images.zip");
  });
};
