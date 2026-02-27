import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Upload } from "lucide-react";
import React from "react";

interface BulkUploadCardProps {
  uploadFile: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBulkUpload: (fileInputRef: React.RefObject<HTMLInputElement>) => void;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const BulkUploadCard: React.FC<BulkUploadCardProps> = ({
  uploadFile,
  onFileSelect,
  onBulkUpload,
  isUploading,
  fileInputRef,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Locations</CardTitle>
        <CardDescription>
          Upload a semicolon-separated CSV file to add multiple locations at
          once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              Headers: <code>"title";"name";"blog_title";...</code>
            </p>
            <Button asChild variant="secondary" size="sm">
              <a href="/sample-travel-locations.csv" download>
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </a>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={onFileSelect}
              ref={fileInputRef}
              className="flex-grow"
            />
            <Button
              onClick={() => onBulkUpload(fileInputRef)}
              disabled={!uploadFile || isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
