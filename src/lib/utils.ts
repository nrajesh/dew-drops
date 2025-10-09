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

/**
 * Helper function to limit gaps in markdown output for display
 * to a maximum of 3 bullet points in the 'Gaps' section.
 */
export const limitGapsInMarkdown = (markdown: string): string => {
  const lines = markdown.split('\n');
  let inGapsSection = false;
  let gapCount = 0;
  const newLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## Gaps')) {
      inGapsSection = true;
      newLines.push(line);
      continue;
    }

    if (inGapsSection) {
      // If it's a bullet point for a gap
      if (line.trim().startsWith('- ') || line.trim().startsWith('+ ')) {
        if (gapCount < 3) { // This is the limit
          newLines.push(line);
          gapCount++;
        }
      } else if (line.trim().length > 0 && !line.trim().startsWith('##')) {
        // Keep non-bullet point text within the gaps section (like 'No significant gaps identified.')
        // but only if it's not another heading
        newLines.push(line);
      } else if (line.trim().startsWith('##')) {
        // If a new heading starts, we're out of the gaps section
        inGapsSection = false;
        newLines.push(line);
      } else {
        // Keep empty lines or other non-bullet, non-heading content
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }
  return newLines.join('\n');
};

/**
 * Helper function to convert markdown to plain text for download,
 * removing markdown formatting like headings, bold, and italics.
 */
export const markdownToPlainText = (markdown: string): string => {
  let plainText = markdown;
  // Remove headings (e.g., ## Matching Areas)
  plainText = plainText.replace(/^#+\s/gm, '');
  // Remove bold/italic markers
  plainText = plainText.replace(/\*\*([^*]+?)\*\*/g, '$1'); // **bold** -> bold
  plainText = plainText.replace(/\*([^*]+?)\*/g, '$1');   // *italic* -> italic
  plainText = plainText.replace(/_([^_]+?)_/g, '$1');     // _italic_ -> italic
  return plainText;
};

/**
 * Strips HTML tags from a string.
 * @param htmlString The input string containing HTML.
 * @returns The string with HTML tags removed.
 */
export const stripHtmlTags = (htmlString: string): string => {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  return doc.body.textContent || "";
};