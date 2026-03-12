import type { GalleryImage } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ManagementPagination } from "@/components/ManagementPagination";
import { ImageListItem } from "./ImageListItem";
import { Download, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ImageManagementCardProps {
  title: string;
  description: string;
  images: GalleryImage[];
  paginatedImages: GalleryImage[];
  selectedImages: Set<string>;
  isLoading: boolean;
  onSelectImage: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (image: GalleryImage) => void;
  onView: (image: GalleryImage, listType: "published" | "unpublished") => void;
  onDelete: () => void;
  onDeleteSingle: (id: string) => void;
  onBulkPublish: (status: boolean) => void;
  onGenerateTags: () => void;
  onGenerateTagsSingle: (id: string) => void;
  onDownload: () => void;
  onTogglePublish: (image: GalleryImage) => void;
  paginationProps: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (value: number) => void;
    totalItems: number;
  };
  listType: "published" | "unpublished";
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export const ImageManagementCard = ({
  title,
  description,
  images,
  paginatedImages,
  selectedImages,
  isLoading,
  onSelectAll,
  onSelectImage,
  onEdit,
  onView,
  onDelete,
  onDeleteSingle,
  onBulkPublish,
  onGenerateTags,
  onGenerateTagsSingle,
  onDownload,
  onTogglePublish,
  paginationProps,
  listType,
  searchValue,
  onSearchChange,
}: ImageManagementCardProps) => {
  const allOnPageSelected =
    paginatedImages.length > 0 &&
    paginatedImages.every((i) => selectedImages.has(i.id));

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-center w-full sm:w-auto">
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    disabled={selectedImages.size === 0}
                  >
                    Bulk Actions ({selectedImages.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onBulkPublish(listType === "unpublished")}
                  >
                    {listType === "unpublished"
                      ? "Publish Selected"
                      : "Unpublish Selected"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onGenerateTags}>
                    Generate Tags (AI)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex-1 sm:flex-none"
                    disabled={selectedImages.size === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedImages.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the {selectedImages.size}{" "}
                      selected image(s). This action cannot be undone.
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
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, alt text, or tag..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : images.length > 0 ? (
          <>
            <div className="flex items-center space-x-2 mb-4 pb-4 border-b">
              <Checkbox
                id={`select-all-${listType}`}
                checked={allOnPageSelected}
                onCheckedChange={onSelectAll}
                disabled={paginatedImages.length === 0}
              />
              <label htmlFor={`select-all-${listType}`}>
                Select All on Page
              </label>
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
                  onDeleteSingle={() => {
                    if (
                      selectedImages.has(image.id) &&
                      selectedImages.size > 1
                    ) {
                      onDelete();
                    } else {
                      onDeleteSingle(image.id);
                    }
                  }}
                  onGenerateTagsSingle={() => {
                    if (
                      selectedImages.has(image.id) &&
                      selectedImages.size > 1
                    ) {
                      onGenerateTags();
                    } else {
                      onGenerateTagsSingle(image.id);
                    }
                  }}
                  isBulkActionMode={selectedImages.size > 0}
                  isPublished={listType === "published"}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-10 border-dashed border-2 rounded-lg bg-muted">
            <p className="text-muted-foreground">
              {searchValue
                ? `No images found for "${searchValue}".`
                : `No ${listType} images found.`}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <ManagementPagination {...paginationProps} />
      </CardFooter>
    </Card>
  );
};
