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
import { processImageUploads, processMetadataUpdate } from "@/components/gallery/GalleryUploadUtils"; // Import new utilities

export const useGalleryManagement = () => {
  const { user } = useAuth();
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState(new Set<string>());
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [unpublishedCurrentPage, setUnpublishedCurrentPage] = useState(1);
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

  const publishedImages = useMemo(() => allImages.filter(img => img.published), [allImages]);
  const unpublishedImages = useMemo(() => allImages.filter(img => !img.published), [allImages]);

  const paginatedPublishedImages = useMemo(() => {
    const startIndex = (currentPage - 1) * imagesPerPage;
    return publishedImages.slice(startIndex, startIndex + imagesPerPage);
  }, [publishedImages, currentPage, imagesPerPage]);

  const paginatedUnpublishedImages = useMemo(() => {
    const startIndex = (unpublishedCurrentPage - 1) * imagesPerPage;
    return unpublishedImages.slice(startIndex, startIndex + imagesPerPage);
  }, [unpublishedImages, unpublishedCurrentPage, imagesPerPage]);

  const totalPages = Math.ceil(publishedImages.length / imagesPerPage);
  const unpublishedTotalPages = Math.ceil(unpublishedImages.length / imagesPerPage);

  const handleUpload = useCallback(async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;
    setIsUploading(true);
    const toastId = showLoading(`Preparing ${selectedFiles.length} file(s)...`);

    try {
      const files = Array.from(selectedFiles);
      const metadataFile = files.find(f => f.name.toLowerCase().endsWith('.json'));
      const imageFiles = files.filter(f => !f.name.toLowerCase().endsWith('.json'));

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

      if (imageFiles.length > 0) {
        const { successfulUploads, totalImageFiles, failedFiles } = await processImageUploads(imageFiles, metadataMap, user.id, toastId);
        if (successfulUploads === totalImageFiles) {
          updateToastSuccess(toastId, "All files uploaded successfully!");
        } else {
          showError(`${successfulUploads} of ${totalImageFiles} files uploaded. Check console for errors.`);
          console.error("Failed image uploads:", failedFiles);
        }
      } else if (metadataFile) {
        const { updatedCount, notFoundCount, failedUpdates } = await processMetadataUpdate(metadataFile, allImages, toastId);
        let summary = `${updatedCount} image(s) updated successfully.`;
        if (notFoundCount > 0) {
          summary += ` ${notFoundCount} file name(s) in your JSON did not match any existing images.`;
        }
        if (failedUpdates.length > 0) {
          summary += ` ${failedUpdates.length} updates failed. Check console for errors.`;
          console.error("Failed metadata updates:", failedUpdates);
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
    unpublishedCurrentPage,
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
    setUnpublishedCurrentPage,
    setImagesPerPage,
    publishedImages,
    unpublishedImages,
    paginatedPublishedImages,
    paginatedUnpublishedImages,
    totalPages,
    unpublishedTotalPages,
  };
};