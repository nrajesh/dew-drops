import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GalleryImage } from "@/types";

// Configuration for required EXIF fields and their display labels
const REQUIRED_EXIF_FIELDS = [
  { path: ['Make', 'description'], label: 'Make' },
  { path: ['Model', 'description'], label: 'Model' },
  { path: ['ExposureTime', 'description'], label: 'Exposure Time' },
  { path: ['FNumber', 'description'], label: 'F Number' },
  { path: ['LensModel', 'description'], label: 'Lens Model' },
  { path: ['ApertureValue', 'description'], label: 'Aperture Value' },
  { path: ['Focal Length', 'description'], label: 'Focal Length' },
  { path: ['ISOSpeedRatings', 'description'], label: 'ISO' },
];

// Helper function to safely retrieve a deeply nested value
const getNestedValue = (obj: any, path: string[]) => {
  return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
};

interface ExifDataDisplayProps {
  exifData: GalleryImage['exif_data'];
}

export const ExifDataDisplay: React.FC<ExifDataDisplayProps> = ({ exifData }) => {
  if (!exifData || Object.keys(exifData).length === 0) {
    return <p className="text-muted-foreground">No EXIF data found for this image.</p>;
  }

  const filteredData = REQUIRED_EXIF_FIELDS.map(({ path, label }) => {
    const value = getNestedValue(exifData, path);
    return { label, value };
  }).filter(item => item.value !== null && item.value !== undefined);

  if (filteredData.length === 0) {
    return <p className="text-muted-foreground">No relevant photographic EXIF data found.</p>;
  }

  return (
    <ScrollArea className="h-96 p-4 border rounded-md">
      <ul className="space-y-2">
        {filteredData.map(({ label, value }) => (
          <li key={label} className="flex justify-between items-start border-b pb-2 last:border-b-0">
            <strong className="text-sm text-muted-foreground">{label}:</strong>
            <span className="font-mono text-sm text-right max-w-[60%] break-words">{String(value)}</span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
};