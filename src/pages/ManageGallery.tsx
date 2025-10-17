import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast, updateToastSuccess, updateToastError } from '@/utils/toast';
import { ImageManagementCard } from '@/components/gallery/ImageManagementCard';
import { ImageUploadDialog } from '@/components/gallery/ImageUploadDialog';
import { ImageEditDialog } from '@/components/gallery/ImageEditDialog';
import { ImageViewDialog } from '@/components/gallery/ImageViewDialog';
import { usePaginationNavigation } from '@/hooks/usePaginationNavigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';
import { generateAltTextFromFileName, normalizeTag } from '@/lib/utils';
import type { GalleryImage } from '@/types';

const ManageGallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [viewingImage, setViewingImage] = useState<GalleryImage | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<'published' | 'unpublished'>('published');
  const [searchTerm, setSearchTerm] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('gallery_images').select('*').order('created_at', { ascending: false });
    if (error) {
      showError('Failed to fetch images.');
      console.error(error);
      setImages([]);
    } else {
      setImages(data as GalleryImage[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const uniqueTags = useMemo(() => {
    const allTags = images.flatMap(image => image.tags || []);
    return Array.from(new Set(allTags.map(normalizeTag))).sort();
  }, [images]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      showError('Please select files to upload.');
      return;
    }

    const toastId = showLoading(`Uploading ${selectedFiles.length} images...`);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated.");

      const uploadPromises = selectedFiles.map(async (file) => {
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gallery')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('gallery')
          .getPublicUrl(uploadData.path);

        const imageUrl = publicUrlData.publicUrl;
        const altText = generateAltTextFromFileName(file.name);

        const { error: insertError } = await supabase.from('gallery_images').insert({
          user_id: user.id,
          file_name: uploadData.path,
          image_url: imageUrl,
          alt_text: altText,
          published: false, // Default to unpublished
        });

        if (insertError) throw insertError;
      });

      await Promise.all(uploadPromises);
      updateToastSuccess(toastId, `${selectedFiles.length} images uploaded successfully!`);
      setSelectedFiles([]);
      setIsUploadDialogOpen(false);
      fetchImages();
    } catch (error: any) {
      updateToastError(toastId, `Upload failed: ${error.message}`);
      console.error('Upload error:', error);
    }
  };

  const handleUpdateImage = async (updatedImage: GalleryImage) => {
    const toastId = showLoading(`Updating image ${generateAltTextFromFileName(updatedImage.file_name)}...`);
    try {
      const { error } = await supabase
        .from('gallery_images')
        .update({
          alt_text: updatedImage.alt_text,
          tags: updatedImage.tags,
          published: updatedImage.published,
        })
        .eq('id', updatedImage.id);

      if (error) throw error;
      updateToastSuccess(toastId, `Image ${generateAltTextFromFileName(updatedImage.file_name)} updated successfully!`);
      setIsEditDialogOpen(false);
      setEditingImage(null);
      fetchImages();
    } catch (error: any) {
      updateToastError(toastId, `Failed to update image: ${error.message}`);
      console.error('Update error:', error);
    }
  };

  const handleEditImage = useCallback((image: GalleryImage) => {
    setEditingImage(image);
    setIsEditDialogOpen(true);
  }, []);

  const handleViewImage = useCallback((image: GalleryImage) => {
    setViewingImage(image);
    setIsViewDialogOpen(true);
  }, []);

  const filteredImages = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return images.filter(image =>
      image.file_name.toLowerCase().includes(lowerCaseSearchTerm) ||
      (image.alt_text && image.alt_text.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (image.tags && image.tags.some(tag => normalizeTag(tag).toLowerCase().includes(lowerCaseSearchTerm)))
    );
  }, [images, searchTerm]);

  const publishedImages = useMemo(() => filteredImages.filter(img => img.published), [filteredImages]);
  const unpublishedImages = useMemo(() => filteredImages.filter(img => !img.published), [filteredImages]);

  return (
    <div className="space-y-8" ref={containerRef}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Manage Gallery</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setIsUploadDialogOpen(true)} className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" /> Upload Images
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'published' | 'unpublished')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="published">Published ({publishedImages.length})</TabsTrigger>
          <TabsTrigger value="unpublished">Unpublished ({unpublishedImages.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="published">
          <ImageManagementCard
            images={publishedImages}
            isLoading={isLoading}
            onRefresh={fetchImages}
            onEditImage={handleEditImage}
            onViewImage={handleViewImage}
            uniqueTags={uniqueTags}
          />
        </TabsContent>
        <TabsContent value="unpublished">
          <ImageManagementCard
            images={unpublishedImages}
            isLoading={isLoading}
            onRefresh={fetchImages}
            onEditImage={handleEditImage}
            onViewImage={handleViewImage}
            uniqueTags={uniqueTags}
          />
        </TabsContent>
      </Tabs>

      <ImageUploadDialog
        isOpen={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        selectedFiles={selectedFiles}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
      />

      {editingImage && (
        <ImageEditDialog
          isOpen={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) setEditingImage(null);
          }}
          image={editingImage}
          onSave={handleUpdateImage}
          uniqueTags={uniqueTags}
        />
      )}

      {viewingImage && (
        <ImageViewDialog
          isOpen={isViewDialogOpen}
          onOpenChange={(isOpen) => {
            setIsViewDialogOpen(isOpen);
            if (!isOpen) setViewingImage(null);
          }}
          image={viewingImage}
        />
      )}
    </div>
  );
};

export default ManageGallery;