import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Download } from "lucide-react";

interface ImageUploadCardProps {
  onFileChange: (files: FileList | null) => void;
  onUpload: () => void;
  isUploading: boolean;
  selectedFiles: FileList | null;
}

export const ImageUploadCard = ({ onFileChange, onUpload, isUploading, selectedFiles }: ImageUploadCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload to Gallery</CardTitle>
        <CardDescription>Select images to upload. You can also include a `.json` file (like the sample) to apply alt text and tags automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              Need a template for your metadata?
            </p>
            <Button asChild variant="secondary" size="sm">
              <a href="/sample-metadata.json" download>
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </a>
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Input
              id="file-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/tiff,application/json"
              onChange={(e) => onFileChange(e.target.files)}
              className="flex-grow"
            />
            <Button onClick={onUpload} disabled={isUploading || !selectedFiles}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};