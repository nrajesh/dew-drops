import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { showSuccess, showError, showLoading, dismissToast, updateToastSuccess, updateToastError, updateToastLoading } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchImages,
  handleDelete,
  handleBulkPublish,
  handleGenerateTags,
  handleBulkDownload,
} from "@/components/gallery/GalleryManagementUtils.ts";
import { sanitizeFileName } from "@/lib/utils";
import imageCompression from 'browser-image-compression';
import ExifReader from 'exifreader';

export const useGalleryManagement = () => {
  const { user } = useAuth();
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState(new Set<string>());
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPerPage, setImagesPerPage] = useState(10);

  const loadImages = useCallback(async () => {
    setIsLoading(true);
    const fetchedImages = await fetchImages();
    setAllImages(fetchedImages);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleUpload = useCallback(async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;
    setIsUploading(true);
    const toastId = showLoading(`Preparing ${selectedFiles.length} file(s)...`);

    try {
      const files = Array.from(selectedFiles);
      const metadataFile = files.find(f => f.name.toLowerCase().endsWith('.json'));
      const imageFiles = files.filter(f => !f.name.toLowerCase().endsWith('.json'));

      if (imageFiles.length > 0) {
        // --- Image Upload Logic ---
        let metadataMap = new Map<string, { alt_text: string; tags: string[] }>();
        if (metadataFile) {
          try {
            const metadataContent = await metadataFile.text();
            const metadataArray = JSON.parse(metadataContent);
            if (Array.isArray(metadataArray)) {
              metadataArray.forEach(item => {
                if (item.fileName) {
                  metadataMap.set(item.fileName, { alt_text: item.alt_text || '', tags: item.tags || [] });
                }
              });
              showSuccess(`Found and processed ${metadataFile.name}.`);
            }
          } catch (e) {
            showError(`Could not parse ${metadataFile.name}. Uploading images without metadata.`);
          }
        }

        let successfulUploads = 0;
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          updateToastLoading(toastId, `Uploading ${i + 1} of ${imageFiles.length}: ${file.name}`);
          try {
            const exifData = await ExifReader.load(file);
            delete exifData['MakerNote'];
            delete exifData['UserComment'];
            if (exifData.thumbnail) delete exifData.thumbnail;

            const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
            const sanitizedName = sanitizeFileName(compressedFile.name);
            const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;

            const { error: uploadError } = await supabase.storage.from('gallery').upload(fileName, compressedFile);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName);
            const metadata = metadataMap.get(file.name);

            const { error: dbError } = await supabase.from('gallery_images').insert({
              user_id: user.id,
              file_name: fileName,
              image_url: publicUrl,
              published: false,
              alt_text: metadata?.alt_text,
              tags: metadata?.tags,
              exif_data: exifData,
            });
            if (dbError) throw dbError;
            successfulUploads++;
          } catch (error: any) {
            updateToastError(toastId, `Failed to upload ${file.name}: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        if (successfulUploads === imageFiles.length) {
          updateToastSuccess(toastId, "All files uploaded successfully!");
        } else {
          showError(`${successfulUploads} of ${imageFiles.length} files uploaded. Check console for errors.`);
        }

      } else if (metadataFile) {
        // --- Metadata-Only Update Logic ---
        updateToastLoading(toastId, `Applying metadata from ${metadataFile.name}...`);
        const metadataContent = await metadataFile.text();
        const metadataArray = JSON.parse(metadataContent);
        let updatedCount = 0;
        let notFoundCount = 0;

        const updatePromises = metadataArray.map(async (meta: any) => {
          if (!meta.fileName) return;
          const sanitizedMetaFileName = sanitizeFileName(meta.fileName);
          const existingImage = allImages.find(img => img.file_name.endsWith(`_${sanitizedMetaFileName}`));

          if (existingImage) {
            const updatePayload: { alt_text?: string; tags?: string[] } = {};
            if (typeof meta.alt_text === 'string') updatePayload.alt_text = meta.alt_text;
            if (Array.isArray(meta.tags)) updatePayload.tags = meta.tags;

            if (Object.keys(updatePayload).length > 0) {
              const { error } = await supabase.from('gallery_images').update(updatePayload).eq('id', existingImage.id);
              if (error) {
                console.error(`Failed to update ${meta.fileName}:`, error);
              } else {
                updatedCount++;
              }
            }
          } else {
            notFoundCount++;
          }
        });

        await Promise.all(updatePromises);
        let summary = `${updatedCount} image(s) updated successfully.`;
        if (notFoundCount > 0) {
          summary += ` ${notFoundCount} file name(s) in your JSON did not match any existing images.`;
        }
        updateToastSuccess(toastId, summary);
      } else {
        dismissToast(toastId);
        showError("Please select image files or a valid metadata JSON file.");
      }
    } catch (error: any) {
      dismissToast(toastId);
      showError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setIsUploading(false);
      setSelectedFiles(null);
      loadImages();
    }
  }, [selectedFiles, user, allImages, loadImages]);

  const handleDeleteWrapper = useCallback(async (imageIds: string[]) => {
    if (await handleDelete(imageIds, allImages)) {
      setSelectedImages(new Set());
      loadImages();
    }
  }, [allImages, loadImages]);

  const handleTogglePublish = useCallback(async (image: GalleryImage) => {
    const newPublishedStatus = !image.published;
    const toastId = showLoading(newPublishedStatus ? "Publishing..." : "Unpublishing...");
    const { error } = await supabase.from("gallery_images").update({ published: newPublishedStatus }).eq("id", image.id);
    if (error) {
      dismissToast(toastId);
      showError(`Failed to update status: ${error.message}`);
    } else {
      dismissToast(toastId);
      showSuccess(`Image ${newPublishedStatus ? "published" : "unpublished"}.`);
      loadImages();
    }
  }, [loadImages]);

  const handleBulkPublishWrapper = useCallback(async (publishStatus: boolean) => {
    if (await handleBulkPublish(selectedImages, publishStatus)) {
      setSelectedImages(new Set());
      loadImages();
    }
  }, [selectedImages, loadImages]);

  const handleGenerateTagsWrapper = useCallback(async () => {
    if ((await handleGenerateTags(selectedImages, allImages)) > 0) {
      loadImages();
    }
    setSelectedImages(new Set());
  }, [selectedImages, allImages, loadImages]);

  const handleBulkDownloadWrapper = useCallback(async () => {
    await handleBulkDownload(selectedImages, allImages);
    setSelectedImages(new Set());
  }, [selectedImages, allImages]);

  const handleSelectImage = (id: string) => {
    const newSelection = new Set(selectedImages);
    newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
    setSelectedImages(newSelection);
  };

  const handleSelectAll = (checked: boolean, paginatedImages: GalleryImage[]) => {
    const pageIds = new Set(paginatedImages.map(i => i.id));
    if (checked) {
      setSelectedImages(prev => new Set([...prev, ...pageIds]));
    } else {
      setSelectedImages(prev => {
        const newSet = new Set(prev);
        pageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  return {
    user,
    allImages,
    selectedFiles,
    isUploading,
    isLoading,
    selectedImages,
    editingImage,
    currentPage,
    imagesPerPage,
    loadImages,
    setSelectedFiles,
    setEditingImage,
    handleUpload,
    handleDeleteWrapper,
    handleTogglePublish,
    handleBulkPublishWrapper,
    handleGenerateTagsWrapper,
    handleBulkDownloadWrapper,
    handleSelectImage,
    handleSelectAll,
    setCurrentPage,
    setImagesPerPage,
  };
};