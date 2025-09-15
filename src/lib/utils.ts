import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeFileName(fileName: string): string {
  let decodedName = fileName;
  try {
    // Attempt to decode, as filenames from some sources might be URI encoded.
    decodedName = decodeURIComponent(fileName);
  } catch (e) {
    // Ignore error if the filename is not a valid URI component (e.g., contains '%').
  }

  // Normalize Unicode to handle characters like "é" consistently.
  const normalized = decodedName.normalize('NFC');

  // Replace whitespace with a single underscore.
  const withUnderscores = normalized.replace(/\s+/g, '_');

  // Remove characters invalid in most file systems and control characters.
  // Invalid chars: / \ : * ? " < > |
  const sanitized = withUnderscores.replace(/[\\/:\*\?"<>\|]|[\x00-\x1f\x7f]/g, '');

  // Remove leading/trailing underscores or dots.
  return sanitized.replace(/^[_.]+|[_.]+$/g, '');
}

export function generateAltTextFromFileName(fileName: string): string {
  if (!fileName) return "";
  
  // Get the part of the filename after the last '/'
  const namePart = fileName.split('/').pop() || fileName;
  
  // Find the first underscore (which separates the timestamp from the original name)
  const firstUnderscoreIndex = namePart.indexOf('_');
  
  // If an underscore is found, take the substring after it. Otherwise, use the whole name part.
  const originalFileName = firstUnderscoreIndex !== -1 
    ? namePart.substring(firstUnderscoreIndex + 1) 
    : namePart;
    
  // Remove the file extension and replace underscores with spaces.
  return originalFileName.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
}