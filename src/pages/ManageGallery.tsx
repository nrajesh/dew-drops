import { useRef, useEffect, useState, Suspense, lazy } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  showSuccess,
  showError,
  showLoading,
  dismissToast,
} from "@/utils/toast";
import { Wand2, Loader2 } from "lucide-react";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGalleryManagement } from "@/hooks/useGalleryManagement";
import { generateAltTextFromFileName, normalizeTag } from "@/lib/utils";
import type { GalleryImage } from "@/types";
import { ImageUploadCard } from "@/components/gallery/ImageUploadCard";
import { ImageManagementCard } from "@/components/gallery/ImageManagementCard";

const LazyImageLightbox = lazy(() =>
  import("@/components/ImageLightbox").then((module) => ({
    default: module.ImageLightbox,
  })),
);

const editSchema = z.object({
  alt_text: z.string().max(200, "Alt text cannot exceed 200 characters."),
  tags: z.string().optional(),
  purchase_link: z
    .string()
    .url({ message: "Please enter a valid URL." })
    .optional()
    .or(z.literal("")),
});

const ManageGallery = () => {
  const {
    selectedFiles,
    isUploading,
    editingImage,
    setEditingImage,
    setSelectedFiles,
    handleUpload,
    handleMetadataUpdate,
    reloadAllGalleryData,
    imagesPerPage,
    setImagesPerPage,

    publishedImages,
    filteredPublishedImages,
    paginatedPublishedImages,
    isLoadingPublished,
    selectedPublishedImages,
    publishedCurrentPage,
    publishedTotalPages,

    setPublishedCurrentPage,
    handleSelectPublishedImage,
    handleSelectAllPublished,
    handleBulkDeletePublished,
    handleBulkPublishPublished,
    handleGenerateTagsPublished,
    handleBulkDownloadPublished,
    handleTogglePublishStatus,
    publishedSearchQuery,
    setPublishedSearchQuery,

    unpublishedImages,
    filteredUnpublishedImages,
    paginatedUnpublishedImages,
    isLoadingUnpublished,
    selectedUnpublishedImages,
    unpublishedCurrentPage,
    unpublishedTotalPages,

    setUnpublishedCurrentPage,
    handleSelectUnpublishedImage,
    handleSelectAllUnpublished,
    handleBulkDeleteUnpublished,
    handleBulkPublishUnpublished,
    handleGenerateTagsUnpublished,
    handleBulkDownloadUnpublished,
    unpublishedSearchQuery,
    setUnpublishedSearchQuery,
  } = useGalleryManagement();

  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(
    null,
  );
  const [activeLightboxList, setActiveLightboxList] = useState<
    "published" | "unpublished" | null
  >(null);
  const [activeTab, setActiveTab] = useState<"published" | "unpublished">(
    "published",
  );
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { alt_text: "", tags: "", purchase_link: "" },
  });

  useEffect(() => {
    if (editingImage) {
      form.reset({
        alt_text: editingImage.alt_text || "",
        tags: editingImage.tags?.join(", ") || "",
        purchase_link: editingImage.purchase_link || "",
      });
    }
  }, [editingImage, form]);

  usePaginationNavigation({
    currentPage:
      activeTab === "published" ? publishedCurrentPage : unpublishedCurrentPage,
    totalPages:
      activeTab === "published" ? publishedTotalPages : unpublishedTotalPages,
    onPageChange:
      activeTab === "published"
        ? setPublishedCurrentPage
        : setUnpublishedCurrentPage,
    targetRef: containerRef,
    enabled: !editingImage && lightboxImageIndex === null,
  });

  const handleUpdateImageData = async (values: z.infer<typeof editSchema>) => {
    if (!editingImage) return;
    const toastId = showLoading("Updating image data...");
    try {
      let finalAltText = values.alt_text;
      if (!finalAltText || finalAltText.trim() === "") {
        finalAltText = generateAltTextFromFileName(editingImage.file_name);
      }

      const tagsArray =
        values.tags
          ?.split(",")
          .map((t) => normalizeTag(t))
          .filter(Boolean) || [];

      const updateData = {
        alt_text: finalAltText,
        tags: tagsArray,
        purchase_link: values.purchase_link || null,
      };

      const { error } = await supabase
        .from("gallery_images")
        .update(updateData)
        .eq("id", editingImage.id);

      if (error) throw error;
      dismissToast(toastId);
      showSuccess("Image data updated successfully!");
      setEditingImage(null);
      reloadAllGalleryData();
    } catch (error: unknown) {
      const err = error as Error;
      dismissToast(toastId);
      showError(`Update failed: ${err.message}`);
    }
  };

  const handleInlineGenerateTags = async () => {
    if (!editingImage) return;
    setIsGeneratingTags(true);
    try {
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("gallery")
          .createSignedUrl(editingImage.file_name, 60);
      if (signedUrlError) throw signedUrlError;

      const { data, error } = await supabase.functions.invoke(
        "generate-tags-from-url",
        {
          body: { imageUrl: signedUrlData.signedUrl, imageId: editingImage.id },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generatedTags: string[] = data?.tags ?? [];
      // Populate the form field so the user can review/edit before saving
      form.setValue("tags", generatedTags.join(", "), { shouldDirty: true });
      showSuccess(`${generatedTags.length} tags generated — review and save!`);
    } catch (err: unknown) {
      showError(`Tag generation failed: ${(err as Error).message}`);
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const openLightbox = (
    image: GalleryImage,
    listType: "published" | "unpublished",
  ) => {
    const list =
      listType === "published"
        ? filteredPublishedImages
        : filteredUnpublishedImages;
    const index = list.findIndex((img) => img.id === image.id);
    if (index !== -1) {
      setActiveLightboxList(listType);
      setLightboxImageIndex(index);
    }
  };

  const closeLightbox = () => {
    setLightboxImageIndex(null);
    setActiveLightboxList(null);
  };

  const navigateLightbox = (direction: "next" | "prev") => {
    if (lightboxImageIndex === null || !activeLightboxList) return;
    const list =
      activeLightboxList === "published"
        ? filteredPublishedImages
        : filteredUnpublishedImages;
    if (direction === "next") {
      setLightboxImageIndex((prevIndex) => (prevIndex! + 1) % list.length);
    } else {
      setLightboxImageIndex(
        (prevIndex) => (prevIndex! - 1 + list.length) % list.length,
      );
    }
  };

  const lightboxList =
    activeLightboxList === "published"
      ? filteredPublishedImages
      : filteredUnpublishedImages;
  const lightboxImage =
    lightboxImageIndex !== null ? lightboxList[lightboxImageIndex] : null;

  return (
    <>
      <div className="space-y-8" ref={containerRef}>
        <ImageUploadCard
          onFileChange={setSelectedFiles}
          onUpload={handleUpload}
          onMetadataApply={handleMetadataUpdate}
          isUploading={isUploading}
          selectedFiles={selectedFiles}
        />

        <Tabs
          defaultValue="published"
          onValueChange={(value) =>
            setActiveTab(value as "published" | "unpublished")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="published"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Published ({publishedImages.length})
            </TabsTrigger>
            <TabsTrigger
              value="unpublished"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Unpublished ({unpublishedImages.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="published">
            <ImageManagementCard
              title="Published Images"
              description="These images are visible on your public gallery. Select images to perform bulk actions."
              images={filteredPublishedImages}
              paginatedImages={paginatedPublishedImages}
              selectedImages={selectedPublishedImages}
              isLoading={isLoadingPublished}
              onSelectImage={handleSelectPublishedImage}
              onSelectAll={handleSelectAllPublished}
              onEdit={setEditingImage}
              onView={openLightbox}
              onDelete={handleBulkDeletePublished}
              onBulkPublish={(status) => handleBulkPublishPublished(status)}
              onGenerateTags={handleGenerateTagsPublished}
              onDownload={handleBulkDownloadPublished}
              onTogglePublish={handleTogglePublishStatus}
              paginationProps={{
                currentPage: publishedCurrentPage,
                totalPages: publishedTotalPages,
                onPageChange: setPublishedCurrentPage,
                itemsPerPage: imagesPerPage,
                onItemsPerPageChange: setImagesPerPage,
                totalItems: filteredPublishedImages.length,
              }}
              listType="published"
              searchValue={publishedSearchQuery}
              onSearchChange={setPublishedSearchQuery}
            />
          </TabsContent>
          <TabsContent value="unpublished">
            <ImageManagementCard
              title="Unpublished Images"
              description="These images are not visible on your public gallery. Select images to perform bulk actions."
              images={filteredUnpublishedImages}
              paginatedImages={paginatedUnpublishedImages}
              selectedImages={selectedUnpublishedImages}
              isLoading={isLoadingUnpublished}
              onSelectImage={handleSelectUnpublishedImage}
              onSelectAll={handleSelectAllUnpublished}
              onEdit={setEditingImage}
              onView={openLightbox}
              onDelete={handleBulkDeleteUnpublished}
              onBulkPublish={(status) => handleBulkPublishUnpublished(status)}
              onGenerateTags={handleGenerateTagsUnpublished}
              onDownload={handleBulkDownloadUnpublished}
              onTogglePublish={handleTogglePublishStatus}
              paginationProps={{
                currentPage: unpublishedCurrentPage,
                totalPages: unpublishedTotalPages,
                onPageChange: setUnpublishedCurrentPage,
                itemsPerPage: imagesPerPage,
                onItemsPerPageChange: setImagesPerPage,
                totalItems: filteredUnpublishedImages.length,
              }}
              listType="unpublished"
              searchValue={unpublishedSearchQuery}
              onSearchChange={setUnpublishedSearchQuery}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={!!editingImage}
        onOpenChange={(isOpen) => !isOpen && setEditingImage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image Data</DialogTitle>
            <DialogDescription>
              Update the alt text, tags, and purchase link for this image.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdateImageData)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="alt_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alt Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., A beautiful sunset over the mountains"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Tags (comma-separated)</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleInlineGenerateTags}
                        disabled={isGeneratingTags}
                        className="h-7 gap-1 text-xs"
                      >
                        {isGeneratingTags ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        {isGeneratingTags ? "Generating…" : "AI Generate"}
                      </Button>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="e.g., nature, mountains, sunset"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchase_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Link</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., https://your-print-store.com/image"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingImage(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Suspense fallback={null}>
        <LazyImageLightbox
          image={lightboxImage}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
          hasNext={lightboxList.length > 1}
          hasPrev={lightboxList.length > 1}
          onUpdate={reloadAllGalleryData}
        />
      </Suspense>
    </>
  );
};

export default ManageGallery;
