import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface BulkImportProps {
  onFileChange: (files: FileList | null) => void;
  onUpload: () => void;
  isUploading: boolean;
  selectedFiles: FileList | null;
  categories: string[];
  onCategorySelection: (selectedCategories: string[]) => void;
}

export const BulkImport = ({
  onFileChange,
  onUpload,
  isUploading,
  selectedFiles,
  categories,
  onCategorySelection
}: BulkImportProps) => {
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleConfirmCategories = () => {
    onCategorySelection(selectedCategories);
    setShowCategoryDialog(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Posts</CardTitle>
          <CardDescription>Upload WordPress XML export files or Markdown (.md) files to create new posts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".xml,.md,text/xml,text/markdown"
              multiple
              onChange={(e) => onFileChange(e.target.files)}
              className="flex-grow"
            />
            <Button onClick={onUpload} disabled={!selectedFiles || isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Importing..." : "Import"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showCategoryDialog && (
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Categories to Import</DialogTitle>
              <DialogDescription>
                Choose which categories you want to import from the XML file.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {categories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => handleCategoryChange(category)}
                  />
                  <Label htmlFor={`category-${category}`}>{category}</Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
              <Button
                onClick={handleConfirmCategories}
                disabled={selectedCategories.length === 0}
              >
                Import Selected Categories
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};