import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, File, X, Download } from 'lucide-react';

interface ImageUploadCardProps {
  onFileChange: (files: File[]) => void;
  onUpload: (metadata?: Record<string, unknown>[]) => Promise<void>;
  onMetadataApply: (metadataFile: File) => Promise<void>;
  isUploading: boolean;
  selectedFiles: File[];
}

export const ImageUploadCard = ({ onFileChange, onUpload, onMetadataApply, isUploading, selectedFiles }: ImageUploadCardProps) => {
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown>[] | undefined>(undefined);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));

      if (imageFiles.length > 0) {
        onFileChange(imageFiles);
      }
      if (jsonFile) {
        processMetadataFile(jsonFile);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    onFileChange(newFiles);
  };

  const processMetadataFile = (file: File) => {
    setMetadataFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content === 'string') {
          const parsed = JSON.parse(content);
          setMetadata(parsed);
        }
      } catch (error) {
        console.error("Error parsing metadata file:", error);
        setMetadata(undefined);
      }
    };
    reader.readAsText(file);
  };

  const handleMetadataFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processMetadataFile(file);
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files);

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));

    if (imageFiles.length > 0) {
      onFileChange(imageFiles);
    }
    if (jsonFile) {
      processMetadataFile(jsonFile);
    }
  }, [onFileChange]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleApplyMetadata = async () => {
    if (metadataFile) {
      await onMetadataApply(metadataFile);
      setMetadataFile(null);
      setMetadata(undefined);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload & Update</CardTitle>
        <CardDescription>
          Upload new images or apply a JSON metadata file to update existing images.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => document.getElementById('image-upload-input')?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Drag & drop files here, or click to browse
          </p>
          <Input
            id="image-upload-input"
            type="file"
            multiple
            accept="image/*,.json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Images to Upload ({selectedFiles.length}):</h4>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2 truncate">
                    <File className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)} disabled={isUploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {metadataFile && (
          <div className="space-y-2">
            <h4 className="font-medium">Metadata File:</h4>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2 truncate">
                <File className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate">{metadataFile.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setMetadataFile(null); setMetadata(undefined); }} disabled={isUploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <label htmlFor="metadata-upload-input" className="text-sm font-medium">Optional Metadata File (.json)</label>
            <Input
              id="metadata-upload-input"
              type="file"
              accept=".json,application/json"
              onChange={handleMetadataFileChange}
              className="mt-1"
            />
          </div>
          <div className="self-end">
            <Button asChild variant="secondary" size="sm">
              <a href="/sample-metadata.json" download>
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </a>
            </Button>
          </div>
        </div>

        {selectedFiles.length > 0 ? (
          <Button
            onClick={() => onUpload(metadata)}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image(s)`}
          </Button>
        ) : metadataFile ? (
          <Button
            onClick={handleApplyMetadata}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? 'Applying...' : 'Apply Metadata to Existing Images'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};