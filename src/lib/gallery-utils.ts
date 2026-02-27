import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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
): Promise<string[]> => {
  const name = friendlyName(image.file_name);
  try {
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from("gallery")
        .createSignedUrl(image.file_name, 60);

    if (signedUrlError) throw signedUrlError;

    const { data, error } = await supabase.functions.invoke(
      "generate-tags-from-url",
      {
        body: { imageUrl: signedUrlData.signedUrl, imageId: image.id },
      },
    );

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const tags: string[] = data?.tags ?? [];

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
