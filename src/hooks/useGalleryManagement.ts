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
import { useManagement } from "./useManagement"; // Import the generic hook

export const useGalleryManagement = () => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);

  const publishedManagement = useManagement<GalleryImage>({
    fetchData: () => fetchImages().then(imgs => imgs.filter(img => img.published)),
    deleteItems: handleDelete,
    updateItemStatus: handleBulkPublish,
    generateItemTags: handleGenerateTags,
    downloadItems: handleBulkDownload,
    initialItemsPerPage: 10,
    idKey: 'id',
    statusKey: 'published',
  });

  const unpublishedManagement = useManagement<GalleryImage>({
    fetchData: () => fetchImages().then(imgs => imgs.filter(img => !img.published)),
    deleteItems: handleDelete,
    updateItemStatus: handleBulkPublish,
    generateItemTags: handleGenerateTags,
    downloadItems: handleBulkDownload,
    initialItemsPerPage: 10,
    idKey: 'id',
    statusKey: 'published',
  });

  // Need a way to reload *both* lists after an upload or status change
  const reloadAllGalleryData = useCallback(() => {
    publishedManagement.loadItems();
    unpublishedManagement.loadItems();
  }, [publishedManagement.loadItems, unpublishedManagement.loadItems]);

  const handleUploadWrapper = useCallback(async () => {
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
        // For metadata updates, we need *all* images to find matches, not just published/unpublished
        const allCurrentImages = [...publishedManagement.allItems, ...unpublishedManagement.allItems];
        const { updatedCount, notFoundCount, failedUpdates } = await processMetadataUpdate(metadataFile, allCurrentImages, toastId);
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
      reloadAllGalleryData(); // Reload both lists
    }
  }, [selectedFiles, user, reloadAllGalleryData, publishedManagement.allItems, unpublishedManagement.allItems]);


  return {
    user,
    selectedFiles,
    isUploading,
    editingImage,
    setEditingImage,
    setSelectedFiles,
    handleUpload: handleUploadWrapper,
    reloadAllGalleryData, // Expose for ImageLightbox onUpdate

    // Published images management
    publishedImages: publishedManagement.allItems,
    paginatedPublishedImages: publishedManagement.paginatedItems,
    isLoadingPublished: publishedManagement.isLoading,
    selectedPublishedImages: publishedManagement.selectedItems,
    publishedCurrentPage: publishedManagement.currentPage,
    publishedTotalPages: publishedManagement.totalPages,
    allPublishedOnPageSelected: publishedManagement.allOnPageSelected,
    setPublishedCurrentPage: publishedManagement.handlePageChange,
    handleSelectPublishedImage: publishedManagement.handleSelectItem,
    handleSelectAllPublished: publishedManagement.handleSelectAllOnPage,
    handleBulkDeletePublished: publishedManagement.handleBulkDelete,
    handleBulkPublishPublished: (status: boolean) => publishedManagement.handleBulkStatusChange(status),
    handleGenerateTagsPublished: publishedManagement.handleGenerateTags,
    handleBulkDownloadPublished: publishedManagement.handleBulkDownload,
    handleTogglePublishStatus: publishedManagement.handleToggleStatus,
    publishedItemsPerPage: publishedManagement.itemsPerPage, // Expose itemsPerPage
    setImagesPerPage: publishedManagement.handleItemsPerPageChange, // This will control itemsPerPage for both

    // Unpublished images management
    unpublishedImages: unpublishedManagement.allItems,
    paginatedUnpublishedImages: unpublishedManagement.paginatedItems,
    isLoadingUnpublished: unpublishedManagement.isLoading,
    selectedUnpublishedImages: unpublishedManagement.selectedItems,
    unpublishedCurrentPage: unpublishedManagement.currentPage,
    unpublishedTotalPages: unpublishedManagement.totalPages,
    allUnpublishedOnPageSelected: unpublishedManagement.allOnPageSelected,
    setUnpublishedCurrentPage: unpublishedManagement.handlePageChange,
    handleSelectUnpublishedImage: unpublishedManagement.handleSelectItem,
    handleSelectAllUnpublished: unpublishedManagement.handleSelectAllOnPage,
    handleBulkDeleteUnpublished: unpublishedManagement.handleBulkDelete,
    handleBulkPublishUnpublished: (status: boolean) => unpublishedManagement.handleBulkStatusChange(status),
    handleGenerateTagsUnpublished: unpublishedManagement.handleGenerateTags,
    handleBulkDownloadUnpublished: unpublishedManagement.handleBulkDownload,
    unpublishedItemsPerPage: unpublishedManagement.itemsPerPage, // Expose itemsPerPage
  };
};