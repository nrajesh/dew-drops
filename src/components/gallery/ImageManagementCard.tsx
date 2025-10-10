import type { GalleryImage } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ManagementPagination } from "@/components/ManagementPagination";
import { ImageListItem } from "./ImageListItem"; // Use the new unified component
import { Download, Trash2 } from "lucide-react";

interface ImageManagementCardProps {
  title: string;
  description: string;
  images: GalleryImage[];
  paginatedImages: GalleryImage[];
  selectedImages: Set<string>;
  isLoading: boolean;
  onSelectImage: (id: string) => void;
  onSelectAll: (checked: boolean) => void; // Simplified prop
  onEdit: (image: GalleryImage) => void;
  onView: (image: GalleryImage, listType: 'published' | 'unpublished') => void;
  onDelete: () => void; // Simplified prop
  onBulkPublish: (status: boolean) => void;
  onGenerateTags: () => void;
  onDownload: () => void; // Simplified prop
  onTogglePublish: (image: GalleryImage) => void;
  paginationProps: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (value: number) => void;
    totalItems: number;
  };
  listType: 'published' | 'unpublished';
}

export const ImageManagementCard = ({
  title,
  description,
  images,
  paginatedImages,
  selectedImages,
  isLoading,
  onSelectImage,
  onSelectAll,
  onEdit,
  onView,
  onDelete,
  onBulkPublish,
  onGenerateTags,
  onDownload,
  onTogglePublish,
  paginationProps,
  listType,
}: ImageManagementCardProps) => {
  const allOnPageSelected = paginatedImages.length > 0 && paginatedImages.every(i => selectedImages.has(i.id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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
                  <DropdownMenuItem onClick={() => onBulkPublish(listType === 'unpublished')}>
                    {listType === 'unpublished' ? 'Publish Selected' : 'Unpublish Selected'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onGenerateTags}>
                    Generate Tags
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDownload}>
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
                    <AlertDialogAction onClick={onDelete}>
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
        {isLoading ? <p>Loading...</p> : images.length > 0 ? (
          <>
            <div className="flex items-center space-x-2 mb-4 pb-4 border-b">
              <Checkbox id={`select-all-${listType}`} checked={allOnPageSelected} onCheckedChange={(checked) => onSelectAll(Boolean(checked))} disabled={paginatedImages.length === 0} />
              <label htmlFor={`select-all-${listType}`}>Select All on Page</label>
            </div>
            <div className="space-y-2">
              {paginatedImages.map((image) => (
                <ImageListItem
                  key={image.id}
                  image={image}
                  isSelected={selectedImages.has(image.id)}
                  onSelect={onSelectImage}
                  onTogglePublish={onTogglePublish}
                  onEdit={onEdit}
                  onView={(img) => onView(img, listType)}
                  isBulkActionMode={selectedImages.size > 0}
                  isPublished={listType === 'published'}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-10 border-dashed border-2 rounded-lg bg-muted">
            <p className="text-muted-foreground">No {listType} images found.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <ManagementPagination {...paginationProps} />
      </CardFooter>
    </Card>
  );
};