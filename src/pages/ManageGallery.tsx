import { useMemo, useRef, useEffect, useState, Suspense, lazy } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGalleryManagement } from "@/hooks/useGalleryManagement";
import { generateAltTextFromFileName } from "@/lib/utils";
import type { GalleryImage } from "@/types";
import { ImageUploadCard } from "@/components/gallery/ImageUploadCard";
import { ImageManagementCard } from "@/components/gallery/ImageManagementCard";

const LazyImageLightbox = lazy(() => import("@/components/ImageLightbox").then(module => ({ default: module.ImageLightbox })));

const editSchema = z.object({
  alt_text: z.string().max(200, "Alt text cannot exceed 200 characters."),
  tags: z.string().optional(),
});

const ManageGallery = () => {
  const {
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
  } = useGalleryManagement();

  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);
  const [activeLightboxList, setActiveLightboxList] = useState<'published' | 'unpublished' | null>(null);

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { alt_text: "", tags: "" },
  });

  useEffect(() => {
    if (editingImage) {
      form.reset({
        alt_text: editingImage.alt_text || '',
        tags: editingImage.tags?.join(', ') || '',
      });
    }
  }, [editingImage, form]);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !editingImage && lightboxImageIndex === null,
  });

  const handleUpdateImageData = async (values: z.infer<typeof editSchema>) => {
    if (!editingImage) return;
    const toastId = showLoading("Updating image data...");
    try {
      let finalAltText = values.alt_text;
      if (!finalAltText || finalAltText.trim() === '') {
        finalAltText = generateAltTextFromFileName(editingImage.file_name);
      }

      const tagsArray = values.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
      const { error } = await supabase.from("gallery_images").update({ alt_text: finalAltText, tags: tagsArray }).eq("id", editingImage.id);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess("Image data updated successfully!");
      setEditingImage(null);
      loadImages();
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Update failed: ${error.message}`);
    }
  };

  const openLightbox = (image: GalleryImage, listType: 'published' | 'unpublished') => {
    const list = listType === 'published' ? publishedImages : unpublishedImages;
    const index = list.findIndex(img => img.id === image.id);
    if (index !== -1) {
      setActiveLightboxList(listType);
      setLightboxImageIndex(index);
    }
  };

  const closeLightbox = () => {
    setLightboxImageIndex(null);
    setActiveLightboxList(null);
  };

  const navigateLightbox = (direction: 'next' | 'prev') => {
    if (lightboxImageIndex === null || !activeLightboxList) return;
    const list = activeLightboxList === 'published' ? publishedImages : unpublishedImages;
    if (direction === 'next') {
      setLightboxImageIndex((prevIndex) => (prevIndex! + 1) % list.length);
    } else {
      setLightboxImageIndex((prevIndex) => (prevIndex! - 1 + list.length) % list.length);
    }
  };

  const lightboxList = activeLightboxList === 'published' ? publishedImages : unpublishedImages;
  const lightboxImage = lightboxImageIndex !== null ? lightboxList[lightboxImageIndex] : null;

  return (
    <>
      <div className="space-y-8" ref={containerRef}>
        <ImageUploadCard
          onFileChange={setSelectedFiles}
          onUpload={handleUpload}
          isUploading={isUploading}
          selectedFiles={selectedFiles}
        />

        <Tabs defaultValue="published">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="published" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Published ({publishedImages.length})</TabsTrigger>
            <TabsTrigger value="unpublished" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Unpublished ({unpublishedImages.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="published">
            <ImageManagementCard
              title="Published Images"
              description="These images are visible on your public gallery. Select images to perform bulk actions."
              images={publishedImages}
              paginatedImages={paginatedPublishedImages}
              selectedImages={selectedImages}
              isLoading={isLoading}
              onSelectImage={handleSelectImage}
              onSelectAll={handleSelectAll}
              onEdit={setEditingImage}
              onView={openLightbox}
              onDelete={handleDeleteWrapper}
              onBulkPublish={handleBulkPublishWrapper}
              onGenerateTags={handleGenerateTagsWrapper}
              onDownload={handleBulkDownloadWrapper}
              onTogglePublish={handleTogglePublish}
              paginationProps={{
                currentPage,
                totalPages,
                onPageChange: setCurrentPage,
                itemsPerPage: imagesPerPage,
                onItemsPerPageChange: setImagesPerPage,
                totalItems: publishedImages.length,
              }}
              listType="published"
            />
          </TabsContent>
          <TabsContent value="unpublished">
            <ImageManagementCard
              title="Unpublished Images"
              description="These images are not visible on your public gallery. Select images to perform bulk actions."
              images={unpublishedImages}
              paginatedImages={paginatedUnpublishedImages}
              selectedImages={selectedImages}
              isLoading={isLoading}
              onSelectImage={handleSelectImage}
              onSelectAll={handleSelectAll}
              onEdit={setEditingImage}
              onView={openLightbox}
              onDelete={handleDeleteWrapper}
              onBulkPublish={handleBulkPublishWrapper}
              onGenerateTags={handleGenerateTagsWrapper}
              onDownload={handleBulkDownloadWrapper}
              onTogglePublish={handleTogglePublish}
              paginationProps={{
                currentPage: unpublishedCurrentPage,
                totalPages: unpublishedTotalPages,
                onPageChange: setUnpublishedCurrentPage,
                itemsPerPage: imagesPerPage,
                onItemsPerPageChange: setImagesPerPage,
                totalItems: unpublishedImages.length,
              }}
              listType="unpublished"
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editingImage} onOpenChange={(isOpen) => !isOpen && setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image Data</DialogTitle>
            <DialogDescription>
              Update the alt text and tags for this image.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateImageData)} className="space-y-4">
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
                    <FormLabel>Tags (comma-separated)</FormLabel>
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingImage(null)}>Cancel</Button>
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
          onUpdate={loadImages}
        />
      </Suspense>
    </>
  );
};

export default ManageGallery;