import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageListItem } from './ImageListItem';
import { ManagementPagination } from '../ManagementPagination';
import { usePaginationNavigation } from '@/hooks/usePaginationNavigation';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, updateToastSuccess, updateToastError } from '@/utils/toast';
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
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MultiSelectPopover } from '@/components/MultiSelectPopover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateAltTextFromFileName, normalizeTag } from '@/lib/utils';
import type { GalleryImage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Download, Tag, Upload, PlusCircle, Pencil, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

interface ImageManagementCardProps {
  images: GalleryImage[];
  isLoading: boolean;
  onRefresh: () => void;
  onEditImage: (image: GalleryImage) => void;
  onViewImage: (image: GalleryImage) => void;
  uniqueTags: string[];
}

export const ImageManagementCard: React.FC<ImageManagementCardProps> = ({
  images,
  isLoading,
  onRefresh,
  onEditImage,
  onViewImage,
  uniqueTags,
}) => {
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [listType, setListType] = useState<'published' | 'unpublished'>('published');
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [bulkEditTags, setBulkEditTags] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  const filteredImages = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filteredBySearch = images.filter(image =>
      image.file_name.toLowerCase().includes(lowerCaseSearchTerm) ||
      (image.alt_text && image.alt_text.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (image.tags && image.tags.some(tag => normalizeTag(tag).toLowerCase().includes(lowerCaseSearchTerm)))
    );

    return filteredBySearch.filter(image =>
      listType === 'published' ? image.published : !image.published
    );
  }, [images, searchTerm, listType]);

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const paginatedImages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredImages.slice(startIndex, endIndex);
  }, [filteredImages, currentPage, itemsPerPage]);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: true,
  });

  const handleSelectImage = useCallback((id: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allImageIds = new Set(paginatedImages.map(image => image.id));
      setSelectedImages(allImageIds);
    } else {
      setSelectedImages(new Set());
    }
  }, [paginatedImages]);

  const handleTogglePublish = useCallback(async (image: GalleryImage) => {
    const toastId = showLoading(`Updating publish status for ${generateAltTextFromFileName(image.file_name)}...`);
    try {
      const { error } = await supabase
        .from('gallery_images')
        .update({ published: !image.published })
        .eq('id', image.id);

      if (error) throw error;
      updateToastSuccess(toastId, `Image ${!image.published ? 'published' : 'unpublished'} successfully!`);
      onRefresh();
    } catch (error: any) {
      updateToastError(toastId, `Failed to update publish status: ${error.message}`);
    }
  }, [onRefresh]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedImages.size === 0) return;

    const toastId = showLoading(`Deleting ${selectedImages.size} images...`);
    try {
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .in('id', Array.from(selectedImages));

      if (error) throw error;
      updateToastSuccess(toastId, `${selectedImages.size} images deleted successfully.`);
      setSelectedImages(new Set());
      onRefresh();
    } catch (error: any) {
      updateToastError(toastId, `Failed to delete images: ${error.message}`);
    }
  }, [selectedImages, onRefresh]);

  const handleBulkTagUpdate = useCallback(async (tags: string[]) => {
    if (selectedImages.size === 0) return;

    const normalizedTags = tags.map(normalizeTag);
    const toastId = showLoading(`Updating tags for ${selectedImages.size} images...`);
    try {
      const { error } = await supabase
        .from('gallery_images')
        .update({ tags: normalizedTags })
        .in('id', Array.from(selectedImages));

      if (error) throw error;
      updateToastSuccess(toastId, `Tags updated for ${selectedImages.size} images.`);
      setSelectedImages(new Set());
      onRefresh();
    } catch (error: any) {
      updateToastError(toastId, `Failed to update tags: ${error.message}`);
    }
  }, [selectedImages, onRefresh]);

  const handleSaveTags = () => {
    handleBulkTagUpdate(bulkEditTags);
    setIsTagDialogOpen(false);
    setBulkEditTags([]);
  };

  const handleCancelTagEdit = () => {
    setIsTagDialogOpen(false);
    setBulkEditTags([]);
  };

  const allOnPageSelected = paginatedImages.length > 0 && paginatedImages.every(image => selectedImages.has(image.id));

  return (
    <Card ref={containerRef}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Manage Gallery Images</CardTitle>
            <CardDescription>View, edit, and organize your uploaded images.</CardDescription>
          </div>
          <div className="flex-grow max-w-sm">
            <Input
              placeholder="Search by file name, alt text, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          {selectedImages.size > 0 && (
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <Button variant="outline" size="sm" onClick={() => setIsTagDialogOpen(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Edit Tags
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete ({selectedImages.size})</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete {selectedImages.size} selected images.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={listType} onValueChange={(value) => setListType(value as 'published' | 'unpublished')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="published">Published ({images.filter(img => img.published).length})</TabsTrigger>
            <TabsTrigger value="unpublished">Unpublished ({images.filter(img => !img.published).length})</TabsTrigger>
          </TabsList>
          <TabsContent value="published" className="mt-4">
            {isLoading ? <p>Loading images...</p> : paginatedImages.length > 0 ? (
              <>
                <div className="flex items-center border-b pb-2 mb-2 space-x-3">
                  <Checkbox id="select-all-published" onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={allOnPageSelected} disabled={paginatedImages.length === 0} />
                  <label htmlFor="select-all-published" className="text-sm font-medium">Select All</label>
                </div>
                <div className="space-y-2 mt-4">
                  {paginatedImages.map(image => (
                    <ImageListItem
                      key={image.id}
                      image={image}
                      isSelected={selectedImages.has(image.id)}
                      onSelect={handleSelectImage}
                      onTogglePublish={handleTogglePublish}
                      onEdit={onEditImage}
                      onView={onViewImage}
                      isBulkActionMode={selectedImages.size > 0}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center pt-4">No published images found.</p>
            )}
          </TabsContent>
          <TabsContent value="unpublished" className="mt-4">
            {isLoading ? <p>Loading images...</p> : paginatedImages.length > 0 ? (
              <>
                <div className="flex items-center border-b pb-2 mb-2 space-x-3">
                  <Checkbox id="select-all-unpublished" onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={allOnPageSelected} disabled={paginatedImages.length === 0} />
                  <label htmlFor="select-all-unpublished" className="text-sm font-medium">Select All</label>
                </div>
                <div className="space-y-2 mt-4">
                  {paginatedImages.map(image => (
                    <ImageListItem
                      key={image.id}
                      image={image}
                      isSelected={selectedImages.has(image.id)}
                      onSelect={handleSelectImage}
                      onTogglePublish={handleTogglePublish}
                      onEdit={onEditImage}
                      onView={onViewImage}
                      isBulkActionMode={selectedImages.size > 0}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center pt-4">No unpublished images found.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <ManagementPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          totalItems={filteredImages.length}
        />
      </CardFooter>

      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Tags</DialogTitle>
            <DialogDescription>
              Set new tags for the {selectedImages.size} selected images. This will overwrite their existing tags.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <MultiSelectPopover
              suggestions={uniqueTags}
              value={bulkEditTags}
              onChange={setBulkEditTags}
              placeholder="Select or create tags..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelTagEdit}>Cancel</Button>
            <Button onClick={handleSaveTags}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};