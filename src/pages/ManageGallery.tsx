import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Upload, Trash2 } from "lucide-react";
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

const ManageGallery = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchImages();
  }, []);

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
      let exifData = null;
      try {
        const tags = ExifReader.load(fileBuffer);
        delete tags['MakerNote'];
        delete tags['UserComment'];
        // Sanitize the EXIF data by converting to a JSON string and back.
        // This handles any special characters or invalid escape sequences.
        exifData = JSON.parse(JSON.stringify(tags));
      } catch (error) {
        console.warn(`Could not read EXIF data for ${file.name}:`, error);
      }

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("gallery_images").insert({
        image_url: publicUrl,
        alt_text: file.name,
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
    if (checked) {
      setSelectedImages(new Set(images.map(img => img.id)));
    } else {
      setSelectedImages(new Set());
    }
  };

  return (
    <div className="space-y-8">
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
              View and delete your uploaded images.
            </CardDescription>
          </div>
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading images...</p>
          ) : images.length > 0 ? (
            <>
              <div className="flex items-center space-x-2 mb-4 pb-4 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectedImages.size === images.length && images.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
                <label htmlFor="select-all" className="text-sm font-medium leading-none">
                  Select All
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="relative group">
                    <div
                      className={`absolute inset-0 bg-black flex items-center justify-center transition-opacity rounded-lg z-10
                        ${selectedImages.has(image.id) ? 'opacity-50' : 'opacity-0 group-hover:opacity-50'}`}
                    >
                      <Checkbox
                        className="h-6 w-6 bg-white border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        checked={selectedImages.has(image.id)}
                        onCheckedChange={() => handleSelectImage(image.id)}
                      />
                    </div>
                    <img
                      src={image.image_url}
                      alt={image.alt_text || "Gallery image"}
                      className="rounded-lg object-cover aspect-square w-full h-full"
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No images found. Upload your first image to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageGallery;