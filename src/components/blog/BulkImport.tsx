import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

interface BulkImportProps {
  onFileChange: (files: FileList | null) => void;
  onUpload: () => void;
  isUploading: boolean;
  selectedFiles: FileList | null;
}

export const BulkImport = ({
  onFileChange,
  onUpload,
  isUploading,
  selectedFiles,
}: BulkImportProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Import Posts</CardTitle>
        <CardDescription>
          Upload WordPress XML export files or Markdown (.md) files to create
          new posts.
        </CardDescription>
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
  );
};
