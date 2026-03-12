import { useState, useMemo, useCallback, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { localDataProvider } from "@/lib/LocalDataProvider";
import { localCache } from "@/lib/LocalCache";
import { usePagination } from "@/hooks/usePagination";
import {
  showSuccess,
  showLoading,
  dismissToast,
  updateToastSuccess,
  updateToastError,
} from "@/utils/toast";
import { generateTagsForImage, downloadImagesAsZip } from "@/lib/gallery-utils";
import type { GalleryImage } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const fetcher = async (key: string) => {
  const [_, isPublishedStr] = key.split(",");
  const isPublished = isPublishedStr === "true";
  const allImages = localDataProvider.getGalleryImages();
  return allImages
    .map((img) => {
      const fileId = `${img.file_name}_${img.id}`;
      const cachedTags = localCache.getCachedTags(fileId);
      const cachedStatus = localCache.getCachedPublishStatus(fileId);

      return {
        ...img,
        tags: cachedTags || img.tags,
        published: cachedStatus !== null ? cachedStatus : img.published,
      };
    })
    .filter((img) => img.published === isPublished)
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );
};

export const useGalleryManagement = () => {
  const { user } = useAuth();
  const { data: publishedData, isLoading: isLoadingPublished } = useSWR(
    "gallery_images,true",
    fetcher,
  );
  const { data: unpublishedData, isLoading: isLoadingUnpublished } = useSWR(
    "gallery_images,false",
    fetcher,
  );

  const publishedImages: GalleryImage[] = useMemo(
    () => publishedData || [],
    [publishedData],
  );
  const unpublishedImages: GalleryImage[] = useMemo(
    () => unpublishedData || [],
    [unpublishedData],
  );

  const [selectedPublishedImages, setSelectedPublishedImages] = useState(
    new Set<string>(),
  );
  const [selectedUnpublishedImages, setSelectedUnpublishedImages] = useState(
    new Set<string>(),
  );
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imagesPerPage, setImagesPerPage] = useState(10);

  const [publishedSearchQuery, setPublishedSearchQuery] = useState("");
  const [unpublishedSearchQuery, setUnpublishedSearchQuery] = useState("");

  const filteredPublishedImages = useMemo(() => {
    if (!publishedSearchQuery) return publishedImages;
    const query = publishedSearchQuery.toLowerCase();
    return publishedImages.filter(
      (image) =>
        image.file_name.toLowerCase().includes(query) ||
        (image.alt_text && image.alt_text.toLowerCase().includes(query)) ||
        (image.tags &&
          image.tags.some((tag) => tag.toLowerCase().includes(query))),
    );
  }, [publishedImages, publishedSearchQuery]);

  const filteredUnpublishedImages = useMemo(() => {
    if (!unpublishedSearchQuery) return unpublishedImages;
    const query = unpublishedSearchQuery.toLowerCase();
    return unpublishedImages.filter(
      (image) =>
        image.file_name.toLowerCase().includes(query) ||
        (image.alt_text && image.alt_text.toLowerCase().includes(query)) ||
        (image.tags &&
          image.tags.some((tag) => tag.toLowerCase().includes(query))),
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
    if (publishedCurrentPage > 1 && paginatedPublishedImages.length === 0)
      setPublishedCurrentPage(1);
  }, [
    publishedSearchQuery,
    paginatedPublishedImages,
    publishedCurrentPage,
    setPublishedCurrentPage,
  ]);

  useEffect(() => {
    if (unpublishedCurrentPage > 1 && paginatedUnpublishedImages.length === 0)
      setUnpublishedCurrentPage(1);
  }, [
    unpublishedSearchQuery,
    paginatedUnpublishedImages,
    unpublishedCurrentPage,
    setUnpublishedCurrentPage,
  ]);

  const reloadAllGalleryData = useCallback(() => {
    mutate("gallery_images,true");
    mutate("gallery_images,false");
    setSelectedPublishedImages(new Set());
    setSelectedUnpublishedImages(new Set());
  }, []);

  const handleSelectPublishedImage = (id: string) => {
    setSelectedPublishedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectUnpublishedImage = (id: string) => {
    setSelectedUnpublishedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const allPublishedOnPageSelected = useMemo(
    () =>
      paginatedPublishedImages.length > 0 &&
      paginatedPublishedImages.every((i) => selectedPublishedImages.has(i.id)),
    [paginatedPublishedImages, selectedPublishedImages],
  );
  const allUnpublishedOnPageSelected = useMemo(
    () =>
      paginatedUnpublishedImages.length > 0 &&
      paginatedUnpublishedImages.every((i) =>
        selectedUnpublishedImages.has(i.id),
      ),
    [paginatedUnpublishedImages, selectedUnpublishedImages],
  );

  const handleSelectAllPublished = (checked: boolean) => {
    setSelectedPublishedImages((prev) => {
      const newSet = new Set(prev);
      paginatedPublishedImages.forEach((image) => {
        if (checked) newSet.add(image.id);
        else newSet.delete(image.id);
      });
      return newSet;
    });
  };

  const handleSelectAllUnpublished = (checked: boolean) => {
    setSelectedUnpublishedImages((prev) => {
      const newSet = new Set(prev);
      paginatedUnpublishedImages.forEach((image) => {
        if (checked) newSet.add(image.id);
        else newSet.delete(image.id);
      });
      return newSet;
    });
  };

  const createBulkAction =
    (
      action: (ids: string[]) => Promise<unknown>,
      loadingMsg: string,
      successMsg: string,
      selectedIds: Set<string>,
    ) =>
    async () => {
      if (selectedIds.size === 0) return;
      const toastId = showLoading(loadingMsg);
      try {
        await action(Array.from(selectedIds));
        updateToastSuccess(toastId, successMsg + " (Local view updated)");
        reloadAllGalleryData();
      } catch (error: unknown) {
        const err = error as Error;
        updateToastError(toastId, err.message || "Bulk action failed.");
      }
    };

  const handleBulkDeleteSub = async (ids: string[]) => {
    // Action logic here (currently just a console log for simulation)
    console.log(`Deleting ${ids.length} images locally.`);
  };

  const handleBulkPublishSub = async (ids: string[], status: boolean) => {
    // Save to local cache for persistence in local simulation
    ids.forEach((id) => {
      const image =
        publishedImages.find((img) => img.id === id) ||
        unpublishedImages.find((img) => img.id === id);
      if (image) {
        localCache.setCachedPublishStatus(
          `${image.file_name}_${image.id}`,
          status,
        );
      }
    });
    console.log(
      `Marked ${ids.length} images as ${status ? "published" : "unpublished"} locally.`,
    );
  };

  const handleGenerateTags = async (ids: string[], force = false) => {
    const imagesToTag = [...publishedImages, ...unpublishedImages].filter(
      (img) => ids.includes(img.id),
    );
    if (imagesToTag.length === 0) return;

    const toastId = showLoading(
      `Generating tags for ${imagesToTag.length} image${imagesToTag.length > 1 ? "s" : ""}…`,
    );

    try {
      let successCount = 0;
      let cachedCount = 0;
      let failCount = 0;

      const CONCURRENCY = 5;
      for (let i = 0; i < imagesToTag.length; i += CONCURRENCY) {
        const chunk = imagesToTag.slice(i, i + CONCURRENCY);
        await Promise.all(
          chunk.map(async (image) => {
            try {
              const cacheKey = `${image.file_name}_${image.id}`;
              const cachedTags = localCache.getCachedTags(cacheKey);

              if (!force && cachedTags) {
                cachedCount++;
                return;
              }

              const tags = await generateTagsForImage(image);
              if (tags && tags.length > 0) {
                localCache.setCachedTags(cacheKey, tags);
                successCount++;
                return;
              }
              failCount++;
            } catch (err) {
              console.error(
                `Failed to generate tags for ${image.file_name}:`,
                err,
              );
              failCount++;
            }
          }),
        );
      }

      const totalProcessed = successCount + cachedCount;
      let message = `✅ Processed ${totalProcessed} image${totalProcessed !== 1 ? "s" : ""}.`;
      if (cachedCount > 0) message += ` (${cachedCount} from cache)`;
      if (failCount > 0) message += ` ❌ ${failCount} failed.`;

      if (totalProcessed > 0) {
        updateToastSuccess(toastId, message);
      } else {
        updateToastError(toastId, message || "Failed to generate tags.");
      }
      reloadAllGalleryData();
    } catch (error: unknown) {
      console.error("Bulk tag generation error:", error);
      updateToastError(
        toastId,
        "An error occurred during bulk tag generation.",
      );
    }
  };

  const handleBulkDownload = async (ids: string[]) => {
    const imagesToDownload = [...publishedImages, ...unpublishedImages].filter(
      (img) => ids.includes(img.id),
    );
    await downloadImagesAsZip(imagesToDownload);
  };

  const handleDeleteSingle = async (_id: string) => {
    const toastId = showLoading("Deleting image locally...");
    updateToastSuccess(toastId, "Image removed from local view.");
    reloadAllGalleryData();
  };

  const handleGenerateTagsSingle = async (id: string) => {
    await handleGenerateTags([id], true);
  };

  const handleTogglePublishStatus = async (image: GalleryImage) => {
    const newStatus = !image.published;
    const toastId = showLoading(
      newStatus ? "Publishing image..." : "Unpublishing image...",
    );

    // Save to local cache for persistence in local simulation
    localCache.setCachedPublishStatus(
      `${image.file_name}_${image.id}`,
      newStatus,
    );

    updateToastSuccess(
      toastId,
      `Image ${newStatus ? "published" : "unpublished"} locally.`,
    );
    reloadAllGalleryData();
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !user) return;
    setIsUploading(true);
    const toastId = showLoading(
      `Starting local simulation of upload for ${selectedFiles.length} file(s)...`,
    );

    showSuccess(
      `${selectedFiles.length} images "uploaded" locally. Source files remain unchanged.`,
    );
    dismissToast(toastId);

    setIsUploading(false);
    setSelectedFiles([]);
    reloadAllGalleryData();
  };

  const handleMetadataUpdate = async () => {
    if (!user) {
      return;
    }
    setIsUploading(true);
    const toastId = showLoading("Applying metadata locally...");
    showSuccess(`Metadata mapping applied to current session.`);
    dismissToast(toastId);
    setIsUploading(false);
    reloadAllGalleryData();
  };

  return {
    selectedFiles,
    isUploading,
    editingImage,
    setEditingImage,
    setSelectedFiles,
    handleUpload,
    reloadAllGalleryData,
    imagesPerPage,
    setImagesPerPage,
    handleMetadataUpdate,
    publishedImages,
    filteredPublishedImages,
    paginatedPublishedImages,
    isLoadingPublished,
    selectedPublishedImages,
    publishedCurrentPage,
    publishedTotalPages,
    allPublishedOnPageSelected,
    setPublishedCurrentPage,
    handleSelectPublishedImage,
    handleSelectAllPublished,
    handleBulkDeletePublished: createBulkAction(
      handleBulkDeleteSub,
      "Deleting images...",
      "Images deleted.",
      selectedPublishedImages,
    ),
    handleBulkPublishPublished: (status: boolean) =>
      createBulkAction(
        (ids) => handleBulkPublishSub(ids, status),
        status ? "Publishing..." : "Unpublishing...",
        "Update successful.",
        selectedPublishedImages,
      )(),
    handleGenerateTagsPublished: async () => {
      if (selectedPublishedImages.size > 0)
        await handleGenerateTags(Array.from(selectedPublishedImages), true);
    },
    handleBulkDownloadPublished: createBulkAction(
      handleBulkDownload,
      "Preparing download...",
      "Download started.",
      selectedPublishedImages,
    ),
    handleTogglePublishStatus,
    handleDeleteSingle,
    handleGenerateTagsSingle,
    publishedSearchQuery,
    setPublishedSearchQuery,
    unpublishedImages,
    filteredUnpublishedImages,
    paginatedUnpublishedImages,
    isLoadingUnpublished,
    selectedUnpublishedImages,
    unpublishedCurrentPage,
    unpublishedTotalPages,
    allUnpublishedOnPageSelected,
    setUnpublishedCurrentPage,
    handleSelectUnpublishedImage,
    handleSelectAllUnpublished,
    handleBulkDeleteUnpublished: createBulkAction(
      handleBulkDeleteSub,
      "Deleting images...",
      "Images deleted.",
      selectedUnpublishedImages,
    ),
    handleBulkPublishUnpublished: (status: boolean) =>
      createBulkAction(
        (ids) => handleBulkPublishSub(ids, status),
        status ? "Publishing..." : "Unpublishing...",
        "Update successful.",
        selectedUnpublishedImages,
      )(),
    handleGenerateTagsUnpublished: async () => {
      if (selectedUnpublishedImages.size > 0)
        await handleGenerateTags(Array.from(selectedUnpublishedImages), true);
    },
    handleBulkDownloadUnpublished: createBulkAction(
      handleBulkDownload,
      "Preparing download...",
      "Download started.",
      selectedUnpublishedImages,
    ),
    unpublishedSearchQuery,
    setUnpublishedSearchQuery,
  };
};
