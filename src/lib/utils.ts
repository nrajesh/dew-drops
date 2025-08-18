import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeFileName(fileName: string): string {
  // Decode URI components to handle encoded characters like %20
  const decodedName = decodeURIComponent(fileName);

  // Normalize to NFD Unicode normal form to separate accents from characters
  const normalizedName = decodedName.normalize('NFD');

  // Remove diacritical marks (accents)
  const withoutAccents = normalizedName.replace(/[\u0300-\u036f]/g, '');

  // Convert to lowercase
  const lowerCaseName = withoutAccents.toLowerCase();

  // Replace spaces and other problematic characters with underscores
  const withUnderscores = lowerCaseName.replace(/\s+/g, '_');

  // Remove any characters that are not letters, numbers, underscores, or dots
  const sanitized = withUnderscores.replace(/[^a-z0-9_.]/g, '');

  return sanitized;
}