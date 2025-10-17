import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from 'lucide-react';

interface ImageUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedFiles: File[];
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
}

export const ImageUploadDialog: React.FC<ImageUploadDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedFiles,
  onFileChange,
  onUpload,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
          <DialogDescription>
            Select one or more image files to upload to your gallery.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="image-files"
            type="file"
            multiple
            accept="image/*"
            onChange={onFileChange}
          />
          {selectedFiles.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedFiles.length} file(s) selected.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onUpload} disabled={selectedFiles.length === 0}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};