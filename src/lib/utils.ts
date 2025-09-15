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
    // Ignore error if the filename is not a valid URI component.
  }

  // Normalize to NFD (Normalization Form Canonical Decomposition).
  // This separates base characters from their diacritical marks (e.g., "é" becomes "e" + "´").
  const normalized = decodedName.normalize('NFD');

  // Remove the diacritical marks.
  const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, '');

  // Replace whitespace with a single underscore.
  const withUnderscores = withoutDiacritics.replace(/\s+/g, '_');

  // Remove any character that is not a letter, number, underscore, dot, or hyphen.
  // This is a very safe character set for filenames.
  const sanitized = withUnderscores.replace(/[^a-zA-Z0-9_.-]/g, '');

  // Remove leading/trailing underscores or dots.
  const finalName = sanitized.replace(/^[_.]+|[_.]+$/g, '');

  // Ensure the filename is not empty after sanitization.
  return finalName || "sanitized_file";
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