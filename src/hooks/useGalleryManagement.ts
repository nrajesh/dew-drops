import { useState, useMemo, useCallback, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { usePagination } from '@/hooks/usePagination';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { generateTagsForImage, downloadImagesAsZip } from '@/lib/gallery-utils';
import type { GalleryImage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeFileName } from '@/lib/utils';

const fetcher = async (key: string) => {
  const [_, isPublishedStr] = key.split(',');
  const isPublished = isPublishedStr === 'true';
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .eq('published', isPublished)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const useGalleryManagement = () => {
  const { user } = useAuth();
  const { data: publishedData, isLoading: isLoadingPublished } = useSWR('gallery_images,true', fetcher);
  const { data: unpublishedData, isLoading: isLoadingUnpublished } = useSWR('gallery_images,false', fetcher);

  const publishedImages: GalleryImage[] = useMemo(() => publishedData || [], [publishedData]);
  const unpublishedImages: GalleryImage[] = useMemo(() => unpublishedData || [], [unpublishedData]);

  const [selectedPublishedImages, setSelectedPublishedImages] = useState(new Set<string>());
  const [selectedUnpublishedImages, setSelectedUnpublishedImages] = useState(new Set<string>());
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imagesPerPage, setImagesPerPage] = useState(10);

  const [publishedSearchQuery, setPublishedSearchQuery] = useState('');
  const [unpublishedSearchQuery, setUnpublishedSearchQuery] = useState('');

  const filteredPublishedImages = useMemo(() => {
    if (!publishedSearchQuery) return publishedImages;
    const query = publishedSearchQuery.toLowerCase();
    return publishedImages.filter(image =>
      image.file_name.toLowerCase().includes(query) ||
      (image.alt_text && image.alt_text.toLowerCase().includes(query)) ||
      (image.tags && image.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }, [publishedImages, publishedSearchQuery]);

  const filteredUnpublishedImages = useMemo(() => {
    if (!unpublishedSearchQuery) return unpublishedImages;
    const query = unpublishedSearchQuery.toLowerCase();
    return unpublishedImages.filter(image =>
      image.file_name.toLowerCase().includes(query) ||
      (image.alt_text && image.alt_text.toLowerCase().includes(query)) ||
      (image.tags && image.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }, [unpublishedImages, unpublishedSearchQuery]);

  const {
    currentPage: publishedCurrentPage,
    totalPages: publishedTotalPages,
    paginatedItems: paginatedPublishedImages,
    setCurrentPage: setPublishedCurrentPage,
  } = usePagination(filteredPublishedImages, imagesPerPage);

  const {
    currentPage: unpublishedCurrentPage,
    totalPages: unpublishedTotalPages,
    paginatedItems: paginatedUnpublishedImages,
    setCurrentPage: setUnpublishedCurrentPage,
  } = usePagination(filteredUnpublishedImages, imagesPerPage);

  useEffect(() => {
    if (publishedCurrentPage !== 1) setPublishedCurrentPage(1);
  }, [publishedSearchQuery, setPublishedCurrentPage, publishedCurrentPage]);

  useEffect(() => {
    if (unpublishedCurrentPage !== 1) setUnpublishedCurrentPage(1);
  }, [unpublishedSearchQuery, setUnpublishedCurrentPage, unpublishedCurrentPage]);

  const reloadAllGalleryData = useCallback(() => {
    mutate('gallery_images,true');
    mutate('gallery_images,false');
    setSelectedPublishedImages(new Set());
    setSelectedUnpublishedImages(new Set());
  }, []);

  const handleSelectPublishedImage = (id: string) => {
    setSelectedPublishedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectUnpublishedImage = (id: string) => {
    setSelectedUnpublishedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const allPublishedOnPageSelected = useMemo(() => paginatedPublishedImages.length > 0 && paginatedPublishedImages.every(i => selectedPublishedImages.has(i.id)), [paginatedPublishedImages, selectedPublishedImages]);
  const allUnpublishedOnPageSelected = useMemo(() => paginatedUnpublishedImages.length > 0 && paginatedUnpublishedImages.every(i => selectedUnpublishedImages.has(i.id)), [paginatedUnpublishedImages, selectedUnpublishedImages]);

  const handleSelectAllPublished = (checked: boolean) => {
    setSelectedPublishedImages(prev => {
      const newSet = new Set(prev);
      paginatedPublishedImages.forEach(image => {
        if (checked) newSet.add(image.id);
        else newSet.delete(image.id);
      });
      return newSet;
    });
  };

  const handleSelectAllUnpublished = (checked: boolean) => {
    setSelectedUnpublishedImages(prev => {
      const newSet = new Set(prev);
      paginatedUnpublishedImages.forEach(image => {
        if (checked) newSet.add(image.id);
        else newSet.delete(image.id);
      });
      return newSet;
    });
  };

  const createBulkAction = (
    action: (ids: string[]) => Promise<any>,
    loadingMsg: string,
    successMsg: string,
    errorMsg: string,
    selectedIds: Set<string>
  ) => async () => {
    if (selectedIds.size === 0) return;
    const toastId = showLoading(loadingMsg);
    try {
      await action(Array.from(selectedIds));
      dismissToast(toastId);
      showSuccess(successMsg);
      reloadAllGalleryData();
    } catch (error: any) {
      dismissToast(toastId);
      showError(`${errorMsg}: ${error.message}`);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    const { error } = await supabase.from('gallery_images').delete().in('id', ids);
    if (error) throw error;
  };

  const handleBulkPublish = async (ids: string[], status: boolean) => {
    const { error } = await supabase.from('gallery_images').update({ published: status }).in('id', ids);
    if (error) throw error;
  };

  const handleGenerateTags = async (ids: string[]) => {
    const imagesToTag = [...publishedImages, ...unpublishedImages].filter(img => ids.includes(img.id));
    await Promise.all(imagesToTag.map(image => generateTagsForImage(image)));
  };

  const handleBulkDownload = async (ids: string[]) => {
    const imagesToDownload = [...publishedImages, ...unpublishedImages].filter(img => ids.includes(img.id));
    await downloadImagesAsZip(imagesToDownload);
  };

  const handleTogglePublishStatus = async (image: GalleryImage) => {
    const toastId = showLoading(image.published ? "Unpublishing image..." : "Publishing image...");
    try {
      const { error } = await supabase.from('gallery_images').update({ published: !image.published }).eq('id', image.id);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess(`Image ${image.published ? "unpublished" : "published"}.`);
      reloadAllGalleryData();
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Failed to toggle publish status: ${error.message}`);
    }
  };

  const handleUpload = async (metadata?: any[]) => {
    if (selectedFiles.length === 0) return;
    if (!user) {
      showError("You must be logged in to upload images.");
      return;
    }
    setIsUploading(true);
    const toastId = showLoading(`Uploading ${selectedFiles.length} file(s)...`);
    try {
      const uploadPromises = selectedFiles.map(async file => {
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;
        const { error: uploadError } = await supabase.storage.from('gallery').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName);
        
        const meta = metadata?.find(m => m.file_name === file.name);

        const { error: dbError } = await supabase.from('gallery_images').insert({
          user_id: user.id,
          file_name: fileName,
          image_url: publicUrl,
          alt_text: meta?.alt_text || null,
          tags: meta?.tags || null,
          purchase_link: meta?.purchase_link || null,
          published: false,
        });
        if (dbError) throw dbError;
      });
      await Promise.all(uploadPromises);
      dismissToast(toastId);
      showSuccess("Upload complete!");
      setSelectedFiles([]);
      reloadAllGalleryData();
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    selectedFiles, isUploading, editingImage, setEditingImage, setSelectedFiles, handleUpload, reloadAllGalleryData, imagesPerPage, setImagesPerPage,
    publishedImages, filteredPublishedImages, paginatedPublishedImages, isLoadingPublished, selectedPublishedImages, publishedCurrentPage, publishedTotalPages, allPublishedOnPageSelected, setPublishedCurrentPage, handleSelectPublishedImage, handleSelectAllPublished,
    handleBulkDeletePublished: createBulkAction(handleBulkDelete, "Deleting images...", "Images deleted.", "Delete failed", selectedPublishedImages),
    handleBulkPublishPublished: (status: boolean) => createBulkAction((ids) => handleBulkPublish(ids, status), status ? "Publishing..." : "Unpublishing...", "Update successful.", "Update failed", selectedPublishedImages)(),
    handleGenerateTagsPublished: createBulkAction(handleGenerateTags, "Generating tags...", "Tag generation started.", "Tag generation failed", selectedPublishedImages),
    handleBulkDownloadPublished: createBulkAction(handleBulkDownload, "Preparing download...", "Download started.", "Download failed", selectedPublishedImages),
    handleTogglePublishStatus, publishedSearchQuery, setPublishedSearchQuery,
    unpublishedImages, filteredUnpublishedImages, paginatedUnpublishedImages, isLoadingUnpublished, selectedUnpublishedImages, unpublishedCurrentPage, unpublishedTotalPages, allUnpublishedOnPageSelected, setUnpublishedCurrentPage, handleSelectUnpublishedImage, handleSelectAllUnpublished,
    handleBulkDeleteUnpublished: createBulkAction(handleBulkDelete, "Deleting images...", "Images deleted.", "Delete failed", selectedUnpublishedImages),
    handleBulkPublishUnpublished: (status: boolean) => createBulkAction((ids) => handleBulkPublish(ids, status), status ? "Publishing..." : "Unpublishing...", "Update successful.", "Update failed", selectedUnpublishedImages)(),
    handleGenerateTagsUnpublished: createBulkAction(handleGenerateTags, "Generating tags...", "Tag generation started.", "Tag generation failed", selectedUnpublishedImages),
    handleBulkDownloadUnpublished: createBulkAction(handleBulkDownload, "Preparing download...", "Download started.", "Download failed", selectedUnpublishedImages),
    unpublishedSearchQuery, setUnpublishedSearchQuery,
  };
};