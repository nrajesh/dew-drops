import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Download, Tag, MoreHorizontal } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Post } from "@/types";

interface BulkActionsSectionProps {
  uploadFiles: File[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessUploads: () => void;
  selectedPosts: Set<string>;
  onBulkTagUpdate: (tags: string[]) => void;
  onBulkStatusChange: (published: boolean) => void;
  onBulkDownload: () => void;
  onDeleteSelected: () => void;
  uniqueTags: string[];
  onCreateNewPost: () => void;
}

export const BulkActionsSection: React.FC<BulkActionsSectionProps> = ({
  uploadFiles,
  onFileUpload,
  onProcessUploads,
  selectedPosts,
  onBulkTagUpdate,
  onBulkStatusChange,
  onBulkDownload,
  onDeleteSelected,
  uniqueTags,
  onCreateNewPost,
}) => {
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [bulkEditTags, setBulkEditTags] = useState<string[]>([]);

  const handleSaveTags = () => {
    onBulkTagUpdate(bulkEditTags);
    setIsTagDialogOpen(false);
    setBulkEditTags([]);
  };

  const handleCancelTagEdit = () => {
    setIsTagDialogOpen(false);
    setBulkEditTags([]);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Manage Blog Posts</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input type="file" multiple onChange={onFileUpload} accept=".xml,.md" className="max-w-xs" />
          {uploadFiles.length > 0 && (
            <Button onClick={onProcessUploads}>Process Uploads ({uploadFiles.length})</Button>
          )}
          <Button onClick={onCreateNewPost}>Create New Post</Button>
        </div>
      </div>

      {selectedPosts.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setIsTagDialogOpen(true)}>
            <Tag className="h-4 w-4 mr-2" />
            Edit Tags
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Actions <MoreHorizontal className="ml-2 h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onBulkStatusChange(true)}>Publish Selected</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkStatusChange(false)}>Unpublish Selected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={onBulkDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download ({selectedPosts.size})
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete ({selectedPosts.size})</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete {selectedPosts.size} selected posts.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteSelected}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Tags</DialogTitle>
            <DialogDescription>
              Set new tags for the {selectedPosts.size} selected posts. This will overwrite their existing tags.
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
    </>
  );
};