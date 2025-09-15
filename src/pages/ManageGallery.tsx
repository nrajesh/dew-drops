import { useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Upload, Trash2, Edit, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ManagementPagination } from "@/components/ManagementPagination";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManagedImage } from "@/components/gallery/ManagedImage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnpublishedList } from "@/components/gallery/UnpublishedList";
import { useGalleryManagement } from "@/hooks/useGalleryManagement";
import { generateAltTextFromFileName } from "@/lib/utils";

const editSchema = z.object({
  alt_text: z.string().max(200, "Alt text cannot exceed 200 characters."),
  tags: z.string().optional(),
});

const ManageGallery = () => {
  const {
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
  } = useGalleryManagement();

  const containerRef = useRef<HTMLDivElement>(null);
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

  const publishedImages = useMemo(() => allImages.filter(img => img.published), [allImages]);
  const unpublishedImages = useMemo(() => allImages.filter(img => !img.published), [allImages]);

  const paginatedPublishedImages = useMemo(() => {
    const startIndex = (currentPage - 1) * imagesPerPage;
    return publishedImages.slice(startIndex, startIndex + imagesPerPage);
  }, [publishedImages, currentPage, imagesPerPage]);

  const totalPages = Math.ceil(publishedImages.length / imagesPerPage);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !editingImage,
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

  const allOnPageSelected = paginatedPublishedImages.length > 0 && paginatedPublishedImages.every(i => selectedImages.has(i.id));

  return (
    <>
      <div className="space-y-8" ref={containerRef}>
        <Card>
          <CardHeader>
            <CardTitle>Upload to Gallery</CardTitle>
            <CardDescription>Select images to upload. You can also include a `metadata.json` file to apply alt text and tags automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Need a template for your metadata?
                </p>
                <Button asChild variant="secondary" size="sm">
                  <a href="/sample-metadata.json" download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/tiff,application/json"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="flex-grow"
                />
                <Button onClick={handleUpload} disabled={isUploading || !selectedFiles}>
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="published">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="published">Published ({publishedImages.length})</TabsTrigger>
            <TabsTrigger value="unpublished">Unpublished ({unpublishedImages.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="published">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Published Images</CardTitle>
                  <CardDescription>These images are visible on your public gallery. Select images to perform bulk actions.</CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedImages.size > 0 && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            Bulk Actions ({selectedImages.size})
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleBulkPublishWrapper(false)}>
                            Unpublish Selected
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleGenerateTagsWrapper}>
                            Generate Tags
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkDownloadWrapper}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Selected
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete ({selectedImages.size})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the {selectedImages.size} selected image(s). This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteWrapper(Array.from(selectedImages))}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? <p>Loading...</p> : publishedImages.length > 0 ? (
                  <>
                    <div className="flex items-center space-x-2 mb-4 pb-4 border-b">
                      <Checkbox id="select-all" checked={allOnPageSelected} onCheckedChange={(checked) => handleSelectAll(Boolean(checked), paginatedPublishedImages)} disabled={paginatedPublishedImages.length === 0} />
                      <label htmlFor="select-all">Select All on Page</label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {paginatedPublishedImages.map((image) => (
                        <ManagedImage key={image.id} image={image} isSelected={selectedImages.has(image.id)} onSelect={handleSelectImage} onTogglePublish={handleTogglePublish} onEdit={setEditingImage} />
                      ))}
                    </div>
                  </>
                ) : <p className="text-center py-8">No published images.</p>}
              </CardContent>
              <CardFooter>
                <ManagementPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={imagesPerPage} onItemsPerPageChange={setImagesPerPage} totalItems={publishedImages.length} />
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="unpublished">
            <Card>
              <CardHeader>
                <CardTitle>Unpublished Images</CardTitle>
                <CardDescription>These images are not visible on your public gallery. Click "Publish" to make them live.</CardDescription>
              </CardHeader>
              <CardContent>
                <UnpublishedList images={unpublishedImages} onPublish={handleTogglePublish} onUpdate={loadImages} />
              </CardContent>
            </Card>
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
    </>
  );
};

export default ManageGallery;