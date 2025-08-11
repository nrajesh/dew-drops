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

const ManageGallery = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
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
      });

      if (dbError) {
        // If DB insert fails, try to clean up the uploaded file
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

  const handleDelete = async (image: GalleryImage) => {
    const toastId = showLoading("Deleting image...");
    try {
      const { error: storageError } = await supabase.storage
        .from("gallery")
        .remove([image.file_name]);

      if (storageError && storageError.message !== 'The resource was not found') {
        throw new Error(`Storage error: ${storageError.message}`);
      }

      const { error: dbError } = await supabase
        .from("gallery_images")
        .delete()
        .eq("id", image.id);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      dismissToast(toastId);
      showError("Image deleted successfully.");
      setImages(images.filter((i) => i.id !== image.id));
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload to Gallery</CardTitle>
          <CardDescription>
            Select one or more images to upload. They will be publicly visible in your gallery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              id="file-input"
              type="file"
              multiple
              accept="image/*"
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
        <CardHeader>
          <CardTitle>Manage Gallery</CardTitle>
          <CardDescription>
            View and delete your uploaded images.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading images...</p>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.image_url}
                    alt={image.alt_text || "Gallery image"}
                    className="rounded-lg object-cover aspect-square w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the image. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(image)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
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