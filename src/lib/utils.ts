import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const normalizeTag = (tag: string) => tag.normalize('NFC').trim();

export const sanitizeFileName = (fileName: string): string => {
  // Replace spaces with underscores, remove special characters, and limit length
  return fileName
    .replace(/\s/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .toLowerCase()
    .substring(0, 100);
};

export const formatDate = (dateString: string | null, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-US', options || { year: 'numeric', month: 'long', day: 'numeric' });
};

export const generateAltTextFromFileName = (fileName: string): string => {
  const nameWithoutExtension = fileName.split('/').pop()?.split('.').slice(0, -1).join('.') || fileName;
  return nameWithoutExtension.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export const limitGapsInMarkdown = (markdown: string, maxConsecutiveNewlines = 2): string => {
  if (!markdown) return '';
  const regex = new RegExp(`\\n{${maxConsecutiveNewlines + 1},}`, 'g');
  return markdown.replace(regex, '\n'.repeat(maxConsecutiveNewlines));
};

export const markdownToPlainText = (markdown: string): string => {
  // Remove code blocks
  let plainText = markdown.replace(/```[\s\S]*?```/g, '');
  // Remove markdown headers
  plainText = plainText.replace(/^(#+\s.*)$/gm, '');
  // Remove bold and italics
  plainText = plainText.replace(/(\*\*|__)(.*?)\1/g, '$2');
  plainText = plainText.replace(/(\*|_)(.*?)\1/g, '$2');
  // Remove links (keep link text)
  plainText = plainText.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  // Remove list markers
  plainText = plainText.replace(/^(\s*[-*+]\s)/gm, '');
  // Replace multiple newlines with single newlines
  plainText = plainText.replace(/\n\s*\n/g, '\n');
  // Trim whitespace from each line and then the whole string
  plainText = plainText.split('\n').map(line => line.trim()).join('\n').trim();
  return plainText;
};

export const cleanJobDescriptionText = (htmlContent: string): string => {
  // Create a temporary div to parse the HTML
  const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
  const bodyText = doc.body.textContent || '';

  // Remove excessive whitespace and normalize newlines
  let cleanedText = bodyText.replace(/\s+/g, ' ').trim();
  cleanedText = cleanedText.replace(/(\r\n|\n|\r){2,}/g, '\n\n'); // Reduce multiple newlines to at most two

  return cleanedText;
};