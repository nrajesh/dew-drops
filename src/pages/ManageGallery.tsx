import { useState, useEffect, useMemo, useRef } from "react";
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
import { showSuccess, showError, showLoading, dismissToast, updateToastSuccess, updateToastError, updateToastLoading } from "@/utils/toast";
import { Upload, Trash2, Edit, Download } from "lucide-react";
import type { GalleryImage } from "@/types";
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
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeFileName } from "@/lib/utils";
import imageCompression from 'browser-image-compression';
import { Checkbox } from "@/components/ui/checkbox";
import { ManagementPagination } from "@/components/ManagementPagination";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchImages,
  handleDelete,
  handleBulkPublish,
  handleGenerateTags,
  handleBulkDownload,
} from "@/components/gallery/GalleryManagementUtils.ts";
import { ManagedImage } from "@/components/gallery/ManagedImage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnpublishedList } from "@/components/gallery/UnpublishedList";

const editSchema = z.object({
  alt_text: z.string().min(3, "Alt text must be at least 3 characters.").max(200, "Alt text cannot exceed 200 characters."),
  tags: z.string().optional(),
});

const ManageGallery = () => {
  const { user } = useAuth();
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState(new Set<string>());
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPerPage, setImagesPerPage] = useState(10);

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

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setIsLoading(true);
    const fetchedImages = await fetchImages();
    setAllImages(fetchedImages);
    setIsLoading(false);
  };

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

  const handleItemsPerPageChange = (value: number) => {
    setImagesPerPage(value);
    setCurrentPage(1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;
    setIsUploading(true);
    const toastId = showLoading(`Uploading ${selectedFiles.length} file(s)...`);
    // ... [rest of upload logic remains the same]
    setIsUploading(false);
    loadImages();
  };

  const handleDeleteWrapper = async (imageIds: string[]) => {
    if (await handleDelete(imageIds, allImages)) {
      setSelectedImages(new Set());
      loadImages();
    }
  };

  const handleUpdateImageData = async (values: z.infer<typeof editSchema>) => {
    if (!editingImage) return;
    const toastId = showLoading("Updating image data...");
    try {
      const tagsArray = values.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
      const { error } = await supabase.from("gallery_images").update({ alt_text: values.alt_text, tags: tagsArray }).eq("id", editingImage.id);
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

  const handleSelectImage = (id: string) => {
    const newSelection = new Set(selectedImages);
    newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
    setSelectedImages(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    const pageIds = new Set(paginatedPublishedImages.map(i => i.id));
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

  const handleTogglePublish = async (image: GalleryImage) => {
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
  };

  const handleBulkPublishWrapper = async (publishStatus: boolean) => {
    if (await handleBulkPublish(selectedImages, publishStatus)) {
      setSelectedImages(new Set());
      loadImages();
    }
  };

  const handleGenerateTagsWrapper = async () => {
    if ((await handleGenerateTags(selectedImages, allImages)) > 0) {
      loadImages();
    }
    setSelectedImages(new Set());
  };

  const handleBulkDownloadWrapper = async () => {
    await handleBulkDownload(selectedImages, allImages);
    setSelectedImages(new Set());
  };

  const allOnPageSelected = paginatedPublishedImages.length > 0 && paginatedPublishedImages.every(i => selectedImages.has(i.id));

  return (
    <>
      <div className="space-y-8" ref={containerRef}>
        <Card>
          <CardHeader>
            <CardTitle>Upload to Gallery</CardTitle>
            <CardDescription>Select one or more images to upload. They will appear in the "Unpublished" tab.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                id="file-input"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/tiff,application/json"
                onChange={handleFileChange}
                className="flex-grow"
              />
              <Button onClick={handleUpload} disabled={isUploading || !selectedFiles}>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
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
                      <Checkbox id="select-all" checked={allOnPageSelected} onCheckedChange={handleSelectAll} disabled={paginatedPublishedImages.length === 0} />
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
                <ManagementPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={imagesPerPage} onItemsPerPageChange={handleItemsPerPageChange} totalItems={publishedImages.length} />
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
                <UnpublishedList images={unpublishedImages} onPublish={handleTogglePublish} />
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