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

    const files = Array.from(selectedFiles);
    let metadataMap = new Map<string, { alt_text: string; tags: string[] }>();

    const metadataFile = files.find(f => f.name.toLowerCase().endsWith('.json'));
    const imageFiles = files.filter(f => !f.name.toLowerCase().endsWith('.json'));

    if (metadataFile) {
        try {
            const metadataContent = await metadataFile.text();
            const metadataArray = JSON.parse(metadataContent);
            if (Array.isArray(metadataArray)) {
                metadataArray.forEach(item => {
                    if (item.fileName) {
                        metadataMap.set(item.fileName, {
                            alt_text: item.alt_text || '',
                            tags: item.tags || [],
                        });
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
            const compressedFile = await imageCompression(file, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            });

            const sanitizedName = sanitizeFileName(compressedFile.name);
            const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;

            const { error: uploadError } = await supabase.storage
                .from('gallery')
                .upload(fileName, compressedFile);

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

    setIsUploading(false);
    setSelectedFiles(null);
    loadImages();
  }, [selectedFiles, user, loadImages]);

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