import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"; // Added missing import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
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
import ExifReader from 'exifreader';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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

const editSchema = z.object({
  alt_text: z.string().min(3, "Alt text must be at least 3 characters.").max(200, "Alt text cannot exceed 200 characters."),
  tags: z.string().optional(),
});

const ManageGallery = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
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
    defaultValues: {
      alt_text: "",
      tags: "",
    },
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
    setImages(fetchedImages);
    setIsLoading(false);
  };

  const paginatedImages = useMemo(() => {
    const startIndex = (currentPage - 1) * imagesPerPage;
    return images.slice(startIndex, startIndex + imagesPerPage);
  }, [images, currentPage, imagesPerPage]);

  const totalPages = Math.ceil(images.length / imagesPerPage);

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

  const getThumbnailUrl = (fileName: string) => {
    const { data } = supabase.storage.from('gallery').getPublicUrl(fileName, {
      transform: {
        width: 200,
        height: 200,
        resize: 'cover',
      },
    });
    return data.publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      showError("Please select files to upload.");
      return;
    }
    if (!user) {
      showError("You must be logged in to upload images.");
      return;
    }
  
    setIsUploading(true);
    const toastId = showLoading(`Preparing ${selectedFiles.length} file(s)...`);
  
    const filesToUpload = Array.from(selectedFiles);
    let metadataMap = new Map<string, { alt_text: string; tags: string[] }>();
  
    const metadataFile = filesToUpload.find(f => f.name === 'metadata.json');
    if (metadataFile) {
      try {
        const metadataContent = await metadataFile.text();
        const metadata = JSON.parse(metadataContent);
        if (Array.isArray(metadata)) {
          for (const item of metadata) {
            if (item.fileName && (item.alt_text || item.tags)) {
              metadataMap.set(item.fileName, {
                alt_text: item.alt_text || "",
                tags: item.tags || [],
              });
            }
          }
        }
        dismissToast(toastId);
        showSuccess("Found and processed metadata.json.");
      } catch (e) {
        dismissToast(toastId);
        showError("Could not parse metadata.json. Proceeding without it.");
      }
    }
  
    const imageFiles = filesToUpload.filter(f => f.type.startsWith('image/'));
    const uploadToastId = showLoading(`Uploading ${imageFiles.length} image(s)...`);
  
    const uploadPromises = imageFiles.map(async (file) => {
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${Date.now()}_${sanitizedName}`;
      const originalFileName = file.name;
      const preloadedMeta = metadataMap.get(originalFileName);
  
      const fileBuffer = await file.arrayBuffer();
      let exifData: Record<string, any> | null = null;
      try {
        const tags = ExifReader.load(fileBuffer);
        const cleanExif: Record<string, any> = {};
        for (const key in tags) {
          if (Object.prototype.hasOwnProperty.call(tags, key)) {
            if (key === 'MakerNote' || key === 'UserComment' || key === 'thumbnail') continue;
            const tagValue = tags[key];
            if (tagValue && typeof tagValue.description !== 'undefined') {
              const description = tagValue.description;
              if (typeof description === 'string') {
                cleanExif[key] = description.replace(/,/g, '.').replace(/[^\w\s.:/-]/g, '');
              } else if (typeof description === 'number') {
                cleanExif[key] = description;
              }
            }
          }
        }
        exifData = cleanExif;
      } catch (error) {
        console.warn(`Could not read EXIF data for ${file.name}:`, error);
      }
  
      const { error: uploadError } = await supabase.storage.from("gallery").upload(fileName, file, { cacheControl: '31536000', upsert: false });
      if (uploadError) throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
  
      const { error: dbError } = await supabase.from("gallery_images").insert({
        alt_text: preloadedMeta?.alt_text || "",
        tags: preloadedMeta?.tags || null,
        file_name: fileName,
        user_id: user.id,
        exif_data: exifData,
        published: false,
      });
  
      if (dbError) {
        await supabase.storage.from("gallery").remove([fileName]);
        throw new Error(`Failed to save ${file.name} to database: ${dbError.message}`);
      }
    });
  
    try {
      await Promise.all(uploadPromises);
      dismissToast(uploadToastId);
      showSuccess(`${imageFiles.length} image(s) uploaded successfully!`);
      loadImages();
    } catch (error: any) {
      dismissToast(uploadToastId);
      showError(error.message);
    } finally {
      setIsUploading(false);
      setSelectedFiles(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleDeleteWrapper = async (imageIds: string[]) => {
    const success = await handleDelete(imageIds, images);
    if (success) {
      setImages(images.filter((i) => !imageIds.includes(i.id)));
      setSelectedImages(new Set());
    }
  };

  const handleUpdateImageData = async (values: z.infer<typeof editSchema>) => {
    if (!editingImage) return;

    const toastId = showLoading("Updating image data...");
    try {
      const tagsArray = values.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
      
      const { error } = await supabase
        .from("gallery_images")
        .update({ 
          alt_text: values.alt_text,
          tags: tagsArray,
        })
        .eq("id", editingImage.id);

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
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedImages(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
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

  const handleTogglePublish = async (image: GalleryImage) => {
    const newPublishedStatus = !image.published;
    const toastId = showLoading(newPublishedStatus ? "Publishing..." : "Unpublishing...");

    const { error } = await supabase
      .from("gallery_images")
      .update({ published: newPublishedStatus })
      .eq("id", image.id);

    if (error) {
      dismissToast(toastId);
      showError(`Failed to update status: ${error.message}`);
    } else {
      dismissToast(toastId);
      showSuccess(`Image ${newPublishedStatus ? "published" : "unpublished"}.`);
      setImages(images.map(i => i.id === image.id ? { ...i, published: newPublishedStatus } : i));
    }
  };

  const handleBulkPublishWrapper = async (publishStatus: boolean) => {
    const success = await handleBulkPublish(selectedImages, publishStatus);
    if (success) {
      loadImages();
      setSelectedImages(new Set());
    }
  };

  const handleGenerateTagsWrapper = async () => {
    const successCount = await handleGenerateTags(selectedImages, images);
    if (successCount > 0) {
      loadImages();
    }
    setSelectedImages(new Set());
  };

  const handleBulkDownloadWrapper = async () => {
    await handleBulkDownload(selectedImages, images);
    setSelectedImages(new Set());
  };

  const handleDownloadSampleMetadata = () => {
    const sampleMetadata = [
      {
        "fileName": "your-image-name-1.jpg",
        "alt_text": "A descriptive alt text for your first image.",
        "tags": ["tag1", "tag2", "tag3"]
      },
      {
        "fileName": "your-image-name-2.png",
        "alt_text": "Another descriptive alt text for your second image.",
        "tags": ["tag4", "tag5"]
      }
    ];
    const jsonString = JSON.stringify(sampleMetadata, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_metadata.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess("Sample metadata.json downloaded!");
  };

  const allOnPageSelected = paginatedImages.length > 0 && paginatedImages.every(i => selectedImages.has(i.id));

  return (
    <>
      <div className="space-y-8" ref={containerRef}>
        <Card>
          <CardHeader>
            <CardTitle>Upload to Gallery</CardTitle>
            <CardDescription>
              Select one or more images to upload. Include a `metadata.json` file from a previous download to automatically apply alt text and tags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
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
              <Button variant="outline" onClick={handleDownloadSampleMetadata} className="w-fit">
                Download Sample metadata.json
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Manage Gallery</CardTitle>
              <CardDescription>
                View, edit, and delete your uploaded images.
              </CardDescription>
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
                      <DropdownMenuItem onClick={() => handleBulkPublishWrapper(true)}>
                        Publish Selected
                      </DropdownMenuItem>
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
            {isLoading ? (
              <p>Loading images...</p>
            ) : images.length > 0 ? (
              <>
                <div className="flex items-center space-x-2 mb-4 pb-4 border-b">
                  <Checkbox
                    id="select-all"
                    checked={allOnPageSelected}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    disabled={paginatedImages.length === 0}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium leading-none">
                    Select All
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {paginatedImages.map((image) => (
                    <Card key={image.id} className="flex flex-col">
                      <CardContent className="p-0">
                        <AspectRatio ratio={1}>
                          <img
                            src={getThumbnailUrl(image.file_name)}
                            alt={image.alt_text || "Gallery image"}
                            className="rounded-t-lg object-cover w-full h-full"
                          />
                        </AspectRatio>
                      </CardContent>
                      <CardFooter className="p-2 flex-col items-start flex-grow justify-between">
                        <p className="text-xs text-muted-foreground truncate w-full h-8">
                          {image.alt_text}
                        </p>
                        <div className="flex justify-between w-full items-center mt-1">
                          <Checkbox
                            id={`select-${image.id}`}
                            checked={selectedImages.has(image.id)}
                            onCheckedChange={() => handleSelectImage(image.id)}
                          />
                          <div className="flex gap-1 items-center">
                            <Switch
                              checked={image.published}
                              onCheckedChange={() => handleTogglePublish(image)}
                              aria-label="Publish status"
                            />
                            <Button variant="ghost" size="sm" onClick={() => setEditingImage(image)}>
                              <Edit className="h-3 w-3 mr-1" /> Edit
                            </Button>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No images found. Upload your first image to get started!
              </p>
            )}
          </CardContent>
          <CardFooter>
            <ManagementPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={imagesPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              totalItems={images.length}
            />
          </CardFooter>
        </Card>
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