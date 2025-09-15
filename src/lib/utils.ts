import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeFileName(fileName: string): string {
  // Decode URI components to handle encoded characters like %20
  const decodedName = decodeURIComponent(fileName);

  // Replace spaces and other whitespace with a single underscore
  const withUnderscores = decodedName.replace(/\s+/g, '_');

  // Remove characters that are invalid in filenames on most OSes.
  // The characters are: / \ : * ? " < > |
  // Also remove control characters from the ASCII range.
  const sanitized = withUnderscores.replace(/[\\/:\*\?"<>\|]/g, '').replace(/[\x00-\x1f\x7f]/g, '');

  // Trim leading/trailing underscores or dots that might result from sanitization
  const trimmed = sanitized.replace(/^[_.]+|[_.]+$/g, '');

  // Convert to NFC form to handle combining characters, which is good practice for file systems.
  const normalized = trimmed.normalize('NFC');

  return normalized;
}

export function generateAltTextFromFileName(fileName: string): string {
  if (!fileName) return "";
  // Get the last part of the path, remove the user_id/timestamp prefix, remove extension, and replace underscores with spaces.
  const originalFileName = fileName.split('/').pop()?.split('_').slice(1).join('_') || fileName;
  return originalFileName.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
}