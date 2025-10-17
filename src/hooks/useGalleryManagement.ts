import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GalleryImage } from "@/types";
import { showSuccess, showError, showLoading, dismissToast, updateToastSuccess, updateToastError, updateToastLoading } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchImages,
  handleDelete,
  handleBulkPublish as galleryHandleBulkPublish, // Renamed to avoid conflict
  handleGenerateTags,
  handleBulkDownload as galleryHandleBulkDownload, // Renamed to avoid conflict
} from "@/components/gallery/GalleryManagementUtils.ts";
import { processImageUploads, processMetadataUpdate } from "@/components/gallery/GalleryUploadUtils";
import { useManagement } from "./useManagement";

export const useGalleryManagement = () => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [imagesPerPage, setImagesPerPage] = useState(10);

  // Use a single instance of useManagement for ALL images
  const {
    allItems: allImages,
    paginatedItems: paginatedAllImages,
    isLoading: isLoadingAll,
    selectedItems: selectedAllImages,
    toggleSelectItem: toggleSelectAllImage,
    clearSelectedItems: clearSelectedAllImages,
    handleCreate: handleCreateImage,
    handleUpdate: handleUpdateImage,
    handleDelete: genericDelete,
    handleToggleStatus: handleTogglePublishStatus,
    handleBulkStatusChange: genericPublish,
    // handleBulkTagUpdate: genericGenerateTags, // Removed as it's a specific action, not a generic update
    handleBulkDownload: genericDownload,
    loadItems: reloadAllGalleryData,
    currentPage: allImagesCurrentPage,
    totalPages: allImagesTotalPages,
    itemsPerPage: allImagesItemsPerPage,
    totalItems: allImagesTotalItems,
    handlePageChange: setAllImagesCurrentPage,
    handleItemsPerPageChange: setAllImagesItemsPerPage,
    handleSelectAllOnPage: handleSelectAllOnAllImagesPage,
    allOnPageSelected: allImagesAllOnPageSelected,
  } = useManagement<GalleryImage>({
    fetchData: fetchImages, // Fetches all images regardless of status
    tableName: 'gallery_images',
    storageBucketName: 'gallery',
    idKey: 'id',
    statusKey: 'published',
    initialItemsPerPage: imagesPerPage,
    deleteItems: handleDelete,
    updateItemStatus: galleryHandleBulkPublish,
    // updateItemTags: handleGenerateTags, // Removed from options
    downloadItems: galleryHandleBulkDownload,
  });

  // Split all images into published and unpublished lists
  const publishedImages = useMemo(() => allImages.filter(img => img.published), [allImages]);
  const unpublishedImages = useMemo(() => allImages.filter(img => !img.published), [allImages]);

  // --- Published Management Logic ---
  const [selectedPublishedImages, setSelectedPublishedImages] = useState<Set<string>>(new Set());
  const [publishedCurrentPage, setPublishedCurrentPage] = useState(1);

  const publishedTotalPages = useMemo(() => Math.ceil(publishedImages.length / imagesPerPage), [publishedImages, imagesPerPage]);
  const paginatedPublishedImages = useMemo(() => {
    const startIndex = (publishedCurrentPage - 1) * imagesPerPage;
    return publishedImages.slice(startIndex, startIndex + imagesPerPage);
  }, [publishedImages, publishedCurrentPage, imagesPerPage]);

  const handleSelectPublishedImage = useCallback((id: string) => {
    setSelectedPublishedImages(prev => {
      const newSelection = new Set(prev);
      newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
      return newSelection;
    });
  }, []);

  const handleSelectAllPublished = useCallback((checked: boolean) => {
    const pageIds = new Set(paginatedPublishedImages.map(item => item.id));
    setSelectedPublishedImages(prev => {
      const newSet = new Set(prev);
      if (checked) {
        pageIds.forEach(id => newSet.add(id));
      } else {
        pageIds.forEach(id => newSet.delete(id));
      }
      return newSet;
    });
  }, [paginatedPublishedImages]);

  const allPublishedOnPageSelected = paginatedPublishedImages.length > 0 && paginatedPublishedImages.every(item => selectedPublishedImages.has(item.id));

  // --- Unpublished Management Logic ---
  const [selectedUnpublishedImages, setSelectedUnpublishedImages] = useState<Set<string>>(new Set());
  const [unpublishedCurrentPage, setUnpublishedCurrentPage] = useState(1);

  const unpublishedTotalPages = useMemo(() => Math.ceil(unpublishedImages.length / imagesPerPage), [unpublishedImages, imagesPerPage]);
  const paginatedUnpublishedImages = useMemo(() => {
    const startIndex = (unpublishedCurrentPage - 1) * imagesPerPage;
    return unpublishedImages.slice(startIndex, startIndex + imagesPerPage);
  }, [unpublishedImages, unpublishedCurrentPage, imagesPerPage]);

  const handleSelectUnpublishedImage = useCallback((id: string) => {
    setSelectedUnpublishedImages(prev => {
      const newSelection = new Set(prev);
      newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
      return newSelection;
    });
  }, []);

  const handleSelectAllUnpublished = useCallback((checked: boolean) => {
    const pageIds = new Set(paginatedUnpublishedImages.map(item => item.id));
    setSelectedUnpublishedImages(prev => {
      const newSet = new Set(prev);
      if (checked) {
        pageIds.forEach(id => newSet.add(id));
      } else {
        pageIds.forEach(id => newSet.delete(id));
      }
      return newSet;
    });
  }, [paginatedUnpublishedImages]);

  const allUnpublishedOnPageSelected = paginatedUnpublishedImages.length > 0 && paginatedUnpublishedImages.every(item => selectedUnpublishedImages.has(item.id));

  // Reset page if current page is out of bounds after filtering/loading
  useEffect(() => {
    if (publishedCurrentPage > publishedTotalPages && publishedTotalPages > 0) {
      setPublishedCurrentPage(publishedTotalPages);
    } else if (publishedCurrentPage === 0 && publishedTotalPages > 0) {
      setPublishedCurrentPage(1);
    }
    if (unpublishedCurrentPage > unpublishedTotalPages && unpublishedTotalPages > 0) {
      setUnpublishedCurrentPage(unpublishedTotalPages);
    } else if (unpublishedCurrentPage === 0 && unpublishedTotalPages > 0) {
      setUnpublishedCurrentPage(1);
    }
  }, [publishedTotalPages, unpublishedTotalPages]);

  // Shared handler for itemsPerPage
  const handleSharedItemsPerPageChange = useCallback((value: number) => {
    setImagesPerPage(value);
    setPublishedCurrentPage(1);
    setUnpublishedCurrentPage(1);
  }, []);

  // --- Bulk action wrappers (now correctly defined using renamed generic handlers) ---

  const handleBulkDeletePublished = useCallback(() => genericDelete(Array.from(selectedPublishedImages), allImages), [genericDelete, selectedPublishedImages, allImages]);
  const handleBulkPublishPublished = useCallback((status: boolean) => genericPublish(selectedPublishedImages, status), [genericPublish, selectedPublishedImages]);
  const handleGenerateTagsPublished = useCallback(() => handleGenerateTags(selectedPublishedImages, allImages), [selectedPublishedImages, allImages]); // Direct call
  const handleBulkDownloadPublished = useCallback(() => genericDownload(selectedPublishedImages, allImages), [genericDownload, selectedPublishedImages, allImages]);

  const handleBulkDeleteUnpublished = useCallback(() => genericDelete(Array.from(selectedUnpublishedImages), allImages), [genericDelete, selectedUnpublishedImages, allImages]);
  const handleBulkPublishUnpublished = useCallback((status: boolean) => genericPublish(selectedUnpublishedImages, status), [genericPublish, selectedUnpublishedImages]);
  const handleGenerateTagsUnpublished = useCallback(() => handleGenerateTags(selectedUnpublishedImages, allImages), [selectedUnpublishedImages, allImages]); // Direct call
  const handleBulkDownloadUnpublished = useCallback(() => genericDownload(selectedUnpublishedImages, allImages), [genericDownload, selectedUnpublishedImages, allImages]);

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
      reloadAllGalleryData();
    }
  }, [selectedFiles, user, reloadAllGalleryData, allImages]);

  return {
    user,
    selectedFiles,
    isUploading,
    editingImage,
    setEditingImage,
    setSelectedFiles,
    handleUpload: handleUploadWrapper,
    reloadAllGalleryData,
    imagesPerPage, // Expose imagesPerPage
    setImagesPerPage: handleSharedItemsPerPageChange, // Expose setter

    // Published images management
    publishedImages,
    paginatedPublishedImages,
    isLoadingPublished: isLoadingAll,
    selectedPublishedImages,
    publishedCurrentPage,
    publishedTotalPages,
    allPublishedOnPageSelected,
    setPublishedCurrentPage,
    handleSelectPublishedImage,
    handleSelectAllPublished,
    handleBulkDeletePublished,
    handleBulkPublishPublished: (status: boolean) => handleBulkPublishPublished(status),
    handleGenerateTagsPublished,
    handleBulkDownloadPublished,
    handleTogglePublishStatus,
    publishedItemsPerPage: imagesPerPage,

    // Unpublished images management
    unpublishedImages,
    paginatedUnpublishedImages,
    isLoadingUnpublished: isLoadingAll,
    selectedUnpublishedImages,
    unpublishedCurrentPage,
    unpublishedTotalPages,
    allUnpublishedOnPageSelected,
    setUnpublishedCurrentPage,
    handleSelectUnpublishedImage,
    handleSelectAllUnpublished,
    handleBulkDeleteUnpublished,
    handleBulkPublishUnpublished: (status: boolean) => handleBulkPublishUnpublished(status),
    handleGenerateTagsUnpublished,
    handleBulkDownloadUnpublished,
    unpublishedItemsPerPage: imagesPerPage,
  };
};