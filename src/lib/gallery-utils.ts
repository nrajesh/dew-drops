import type { GalleryImage } from "@/types";
import { analyzeImage } from "@/integrations/gemini/client";
import { showError } from "@/utils/toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";

/**
 * Generates a low-resolution base64 version of an image for faster AI processing.
 */
const generateLowResVersion = async (
  imageUrl: string,
  maxWidth = 512,
): Promise<string> => {
  // Ensure absolute URL if it's a relative path
  const fullUrl = imageUrl.startsWith("/")
    ? window.location.origin + imageUrl
    : imageUrl;

  return new Promise((resolve, reject) => {
    const img = new Image();
    // Use anonymous crossOrigin only for external URLs to avoid CORS issues on local ones
    if (fullUrl.startsWith("http") && !fullUrl.includes(window.location.host)) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ratio = img.width / img.height;
        canvas.width = Math.min(maxWidth, img.width);
        canvas.height = canvas.width / ratio;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${fullUrl}`));
    img.src = fullUrl;
  });
};

/**
 * Generates tags for an image using Gemini.
 * Uses a low-res version to simulate optimized transmission.
 */
export const generateTagsForImage = async (
  image: GalleryImage,
): Promise<string[]> => {
  try {
    const imageUrl = image.image_url || `/uploads/${image.file_name}`;
    console.log("Optimizing image for AI identification:", image.file_name);

    let lowResData: string;
    try {
      lowResData = await generateLowResVersion(imageUrl);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.warn("Low-res optimization failed:", err.message);
      }
      // Fallback: try to fetch and convert to base64 directly if canvas/loading failed
      try {
        console.log("Attempting direct base64 conversion fallback...");
        const fullUrl = imageUrl.startsWith("/")
          ? window.location.origin + imageUrl
          : imageUrl;
        const response = await fetch(fullUrl);
        const blob = await response.blob();
        lowResData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (fallbackErr: unknown) {
        if (fallbackErr instanceof Error) {
          console.error("All fallback attempts failed:", fallbackErr.message);
        }
        throw new Error("Could not process image for AI analysis");
      }
    }

    console.log(
      `Sending optimized payload (${lowResData.length} chars) to AI service...`,
    );

    const tags = await analyzeImage(
      lowResData,
      "Generate 5-10 specific tags for this image (e.g., location, subjects, mood). Return as a comma-separated list. No preamble.",
    );

    console.log("AI Generated tags:", tags);
    if (!tags || tags.length === 0) {
      throw new Error("AI service returned no tags");
    }
    return tags;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Tag generation error:", error);
    }
    throw error;
  }
};

/**
 * Downloads a list of images as a ZIP file.
 */
export const downloadImagesAsZip = async (
  images: GalleryImage[],
): Promise<void> => {
  if (images.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder("images");

  try {
    const downloadPromises = images.map(async (image) => {
      const imageUrl = image.image_url || `/uploads/${image.file_name}`;
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch ${image.file_name}`);
      const blob = await response.blob();
      folder?.file(image.file_name, blob);
    });

    await Promise.all(downloadPromises);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "gallery_images.zip");
  } catch (error: unknown) {
    const err = error as Error;
    showError(`Failed to download images: ${err.message} `);
  }
};
