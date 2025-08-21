import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeFileName(fileName: string): string {
  // Decode URI components to handle encoded characters like %20
  const decodedName = decodeURIComponent(fileName);

  // Remove any characters that are not alphanumeric, underscore, hyphen, or dot
  // This is a more aggressive approach that will remove most special characters
  const sanitized = decodedName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  // Replace multiple underscores with a single one
  const singleUnderscores = sanitized.replace(/_+/g, '_');

  // Trim leading/trailing underscores or dots
  const trimmed = singleUnderscores.replace(/^[_.]+|[_.]+$/g, '');

  // If the result is empty, use a default name
  if (!trimmed) {
    return `file_${Date.now()}`;
  }

  return trimmed;
}