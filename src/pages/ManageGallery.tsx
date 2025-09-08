import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Upload, Trash2, Edit } from "lucide-react";
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
import { ManagementPagination } from "@/components/ManagementPagination";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";

const editSchema = z.object({
  alt_text: z.string().min(3, "Alt text must be at least 3 characters.").max(200, "Alt text cannot exceed 200 characters."),
});

const ManageGallery = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState(new Set<string>());
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPerPage, setImagesPerPage] = useState(10);

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      alt_text: "",
    },
  });

  useEffect(() => {
    if (editingImage) {
      form.reset({ alt_text: editingImage.alt_text || '' });
    }
  }, [editingImage, form]);

  useEffect(() => {
    fetchImages();
  }, []);

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

  const fetchImages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch images.");
      console.error(error);
    } else {
      setImages(data as GalleryImage[]);
    }
    setIsLoading(false);
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
    const toastId = showLoading(`Uploading ${selectedFiles.length} image(s)...`);

    const uploadPromises = Array.from(selectedFiles).map(async (file) => {
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;

      const fileBuffer = await file.arrayBuffer();
      let exifData: Record<string, any> | null = null;
      try {
        const tags = ExifReader.load(fileBuffer);
        const cleanExif: Record<string, any> = {};

        for (const key in tags) {
          if (Object.prototype.hasOwnProperty.call(tags, key)) {
            if (key === 'MakerNote' || key === 'UserComment' || key === 'thumbnail') {
              continue;
            }

            const tagValue = tags[key];
            if (tagValue && typeof tagValue.description !== 'undefined') {
              const description = tagValue.description;

              if (typeof description === 'string') {
                const sanitized = description
                  .replace(/,/g, '.')
                  .replace(/[^\w\s.:/-]/g, '');
                cleanExif[key] = sanitized;
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

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file, {
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("gallery_images").insert({
        image_url: publicUrl,
        alt_text: "",
        file_name: fileName,
        user_id: user.id,
        exif_data: exifData,
      });

      if (dbError) {
        await supabase.storage.from("gallery").remove([fileName]);
        throw new Error(`Failed to save ${file.name} to database: ${dbError.message}`);
      }
    });

    try {
      await Promise.all(uploadPromises);
      dismissToast(toastId);
      showSuccess(`${selectedFiles.length} image(s) uploaded successfully!`);
      fetchImages();
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    } finally {
      setIsUploading(false);
      setSelectedFiles(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleDelete = async (imageIds: string[]) => {
    const toastId = showLoading(`Deleting ${imageIds.length} image(s)...`);
    try {
      const imagesToDelete = images.filter(img => imageIds.includes(img.id));
      const fileNamesToDelete = imagesToDelete.map(img => img.file_name);

      if (fileNamesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("gallery")
          .remove(fileNamesToDelete);

        if (storageError && storageError.message !== 'The resource was not found') {
          throw new Error(`Storage error: ${storageError.message}`);
        }
      }

      const { error: dbError } = await supabase
        .from("gallery_images")
        .delete()
        .in("id", imageIds);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      dismissToast(toastId);
      showError(`${imageIds.length} image(s) deleted successfully.`);
      setImages(images.filter((i) => !imageIds.includes(i.id)));
      setSelectedImages(new Set());
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  };

  const handleUpdateAltText = async (values: z.infer<typeof editSchema>) => {
    if (!editingImage) return;

    const toastId = showLoading("Updating alt text...");
    try {
      const updatedImages = images.map(img =>
        img.id === editingImage.id ? { ...img, alt_text: values.alt_text } : img
      );
      setImages(updatedImages);

      const { error } = await supabase
        .from("gallery_images")
        .update({ alt_text: values.alt_text })
        .eq("id", editingImage.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Alt text updated successfully!");
      setEditingImage(null);
    } catch (error: any) {
      setImages(images);
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

  const allOnPageSelected = paginatedImages.length > 0 && paginatedImages.every(i => selectedImages.has(i.id));

  return (
    <>
      <div className="space-y-8" ref={containerRef}>
        <Card>
          <CardHeader>
            <CardTitle>Upload to Gallery</CardTitle>
            <CardDescription>
              Select one or more images to upload. EXIF data will be automatically extracted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                id="file-input"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/tiff"
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
                      <AlertDialogAction onClick={() => handleDelete(Array.from(selectedImages))}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                          <div className="flex gap-1">
                            {image.embedding && (
                              <span className="text-xs text-green-500">✓</span>
                            )}
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
            <DialogTitle>Edit Alt Text</DialogTitle>
            <DialogDescription>
              Write a descriptive alt text for this image. This helps with accessibility and SEO.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateAltText)} className="space-y-4">
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