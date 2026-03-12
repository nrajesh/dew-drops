import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GalleryImage } from "@/types";

// Configuration for required EXIF fields and their display labels
const REQUIRED_EXIF_FIELDS = [
  { path: ["Make", "description"], label: "Make" },
  { path: ["Model", "description"], label: "Model" },
  { path: ["ExposureTime", "description"], label: "Exposure Time" },
  { path: ["FNumber", "description"], label: "Aperture" },
  { path: ["ISOSpeedRatings", "description"], label: "ISO" },
  { path: ["FocalLength", "description"], label: "Focal Length" },
  { path: ["LensModel", "description"], label: "Lens" },
  { path: ["Software", "description"], label: "Software" },
  { path: ["DateTimeOriginal", "description"], label: "Date Taken" },
];

// Helper function to safely retrieve a deeply nested value
const getNestedValue = (
  obj: Record<string, unknown> | null,
  path: string[],
): unknown => {
  let current: unknown = obj;
  for (const key of path) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }
  return current;
};

interface ExifDataDisplayProps {
  exifData: GalleryImage["exif_data"];
}

export const ExifDataDisplay: React.FC<ExifDataDisplayProps> = ({
  exifData,
}) => {
  if (!exifData || Object.keys(exifData).length === 0) {
    return (
      <p className="text-muted-foreground">
        No EXIF data found for this image.
      </p>
    );
  }

  const filteredData = REQUIRED_EXIF_FIELDS.map(({ path, label }) => {
    const value = getNestedValue(exifData, path);
    return { label, value };
  }).filter((item) => item.value !== null && item.value !== undefined);

  if (filteredData.length === 0) {
    return (
      <p className="text-muted-foreground">
        No relevant photographic EXIF data found.
      </p>
    );
  }

  return (
    <ScrollArea className="h-96 p-4 border rounded-md">
      <ul className="space-y-2">
        {filteredData.map(({ label, value }) => (
          <li
            key={label}
            className="flex justify-between items-start border-b pb-2 last:border-b-0"
          >
            <strong className="text-sm text-muted-foreground">{label}:</strong>
            <span className="font-mono text-sm text-right max-w-[60%] break-words">
              {String(value)}
            </span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
};
