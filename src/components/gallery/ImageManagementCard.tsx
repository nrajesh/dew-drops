import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Upload, Search, Trash2, Eye, Edit, Image as ImageIcon, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/AuthContext';
import { ImageListItem } from '@/components/gallery/ImageListItem';
import { ImageFormDialog } from '@/components/gallery/ImageFormDialog';
import { ImagePreviewDialog } from '@/components/gallery/ImagePreviewDialog';
import { BulkActionsSection } from '@/components/gallery/BulkActionsSection';
import { useManagement } from '@/hooks/useManagement';
import type { GalleryImage } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export const ImageManagementCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [listType, setListType] = useState<'all' | 'published' | 'unpublished'>('all');

  const fetchImages = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast({
        title: 'Error fetching images',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
    return data as GalleryImage[];
  }, [user, toast]);

  const {
    allItems: images,
    setAllItems: setImages,
    searchTerm,
    setSearchTerm,
    selectedItems: selectedImages,
    toggleSelectItem: toggleSelectImage,
    clearSelectedItems: clearSelectedImages,
    handleCreate: handleCreateImage,
    handleUpdate: handleUpdateImage,
    handleDelete: handleDeleteImages,
    handleToggleStatus: handleTogglePublishImage,
    handleBulkStatusChange: handleBulkPublish, // Renamed to match component prop
    handleBulkStatusChange: handleBulkUnpublish, // Renamed to match component prop
    handleBulkDelete: handleBulkDeleteGeneric, // Renamed to avoid conflict with local handleDeleteImages
    isLoading: loading,
    error,
    paginatedItems,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    handleSelectAllOnPage,
    allOnPageSelected,
  } = useManagement<GalleryImage>({
    fetchData: fetchImages,
    tableName: 'gallery_images',
    storageBucketName: 'gallery-images',
    idKey: 'id',
    statusKey: 'published',
    initialItemsPerPage: 10,
    deleteItems: handleDeleteImages, // Pass the specific delete function
    updateItemStatus: async (ids, status) => { // Inline implementation for updateItemStatus
      const { error } = await supabase
        .from('gallery_images')
        .update({ published: status })
        .in('id', Array.from(ids));
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Operation failed',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const filteredImages = useMemo(() => {
    let filtered = images;
    if (listType === 'published') {
      filtered = filtered.filter(image => image.published);
    } else if (listType === 'unpublished') {
      filtered = filtered.filter(image => !image.published);
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(image =>
        image.file_name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (image.alt_text && image.alt_text.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (image.tags && image.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm)))
      );
    }
    return filtered;
  }, [images, listType, searchTerm]);

  const handleEditImage = (image: GalleryImage) => {
    setSelectedImage(image);
    setIsFormDialogOpen(true);
  };

  const handleViewImage = (image: GalleryImage) => {
    setSelectedImage(image);
    setIsPreviewDialogOpen(true);
  };

  const handleNewImage = () => {
    setSelectedImage(null);
    setIsFormDialogOpen(true);
  };

  const handleImageFormSubmit = async (formData: Omit<GalleryImage, 'id' | 'user_id' | 'created_at' | 'image_url'>, file: File | null) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to manage images.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedImage) {
      // Update existing image
      await handleUpdateImage(selectedImage.id, formData, file);
    } else {
      // Create new image
      await handleCreateImage(formData, file);
    }
    setIsFormDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Image Gallery Management</h2>
        <Button onClick={handleNewImage}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Image
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
              onClick={() => setSearchTerm('')}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Tabs value={listType} onValueChange={(value) => setListType(value as 'all' | 'published' | 'unpublished')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All ({images.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({images.filter(img => img.published).length})</TabsTrigger>
          <TabsTrigger value="unpublished">Unpublished ({images.filter(img => !img.published).length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <BulkActionsSection
            selectedItemCount={selectedImages.size}
            onPublish={() => handleBulkPublish(selectedImages, true)}
            onUnpublish={() => handleBulkPublish(selectedImages, false)}
            onDelete={() => handleBulkDeleteGeneric(Array.from(selectedImages))}
            itemType="images"
          />
          {loading ? (
            <p>Loading images...</p>
          ) : filteredImages.length === 0 ? (
            <p className="text-center text-muted-foreground mt-8">No images found.</p>
          ) : (
            <div className="space-y-2 mt-4">
              {filteredImages.map((image) => (
                <ImageListItem
                  key={image.id}
                  image={image}
                  isSelected={selectedImages.has(image.id)}
                  onSelect={toggleSelectImage}
                  onTogglePublish={handleTogglePublishImage}
                  onEdit={handleEditImage}
                  onView={handleViewImage}
                  isBulkActionMode={selectedImages.size > 0}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="published" className="mt-4">
          <BulkActionsSection
            selectedItemCount={selectedImages.size}
            onPublish={() => handleBulkPublish(selectedImages, true)}
            onUnpublish={() => handleBulkPublish(selectedImages, false)}
            onDelete={() => handleBulkDeleteGeneric(Array.from(selectedImages))}
            itemType="images"
          />
          {loading ? (
            <p>Loading images...</p>
          ) : filteredImages.length === 0 ? (
            <p className="text-center text-muted-foreground mt-8">No published images found.</p>
          ) : (
            <div className="space-y-2 mt-4">
              {filteredImages.map((image) => (
                <ImageListItem
                  key={image.id}
                  image={image}
                  isSelected={selectedImages.has(image.id)}
                  onSelect={toggleSelectImage}
                  onTogglePublish={handleTogglePublishImage}
                  onEdit={handleEditImage}
                  onView={handleViewImage}
                  isBulkActionMode={selectedImages.size > 0}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="unpublished" className="mt-4">
          <BulkActionsSection
            selectedItemCount={selectedImages.size}
            onPublish={() => handleBulkPublish(selectedImages, true)}
            onUnpublish={() => handleBulkPublish(selectedImages, false)}
            onDelete={() => handleBulkDeleteGeneric(Array.from(selectedImages))}
            itemType="images"
          />
          {loading ? (
            <p>Loading images...</p>
          ) : filteredImages.length === 0 ? (
            <p className="text-center text-muted-foreground mt-8">No unpublished images found.</p>
          ) : (
            <div className="space-y-2 mt-4">
              {filteredImages.map((image) => (
                <ImageListItem
                  key={image.id}
                  image={image}
                  isSelected={selectedImages.has(image.id)}
                  onSelect={toggleSelectImage}
                  onTogglePublish={handleTogglePublishImage}
                  onEdit={handleEditImage}
                  onView={handleViewImage}
                  isBulkActionMode={selectedImages.size > 0}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedImage ? 'Edit Image Metadata' : 'Add New Image'}</DialogTitle>
          </DialogHeader>
          <ImageFormDialog
            image={selectedImage}
            onSubmit={handleImageFormSubmit}
            onCancel={() => setIsFormDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && <ImagePreviewDialog image={selectedImage} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};