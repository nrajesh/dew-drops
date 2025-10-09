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
 * Cleans job description text by stripping HTML tags, removing excessive newlines,
 * and filtering out single-word paragraphs.
 * @param text The input string, potentially containing HTML.
 * @returns The cleaned plain text.
 */
export const cleanJobDescriptionText = (text: string): string => {
  // 1. Strip HTML tags
  const doc = new DOMParser().parseFromString(text, 'text/html');
  let plainText = doc.body.textContent || "";

  // 2. Replace multiple newlines with a single space, then normalize spaces
  plainText = plainText.replace(/(\r\n|\n|\r){2,}/g, ' ').replace(/\s\s+/g, ' ').trim();

  // 3. Remove single-word "paragraphs" (now single words separated by spaces)
  // This regex looks for a single word followed by a space or end of string,
  // and replaces it with just a space, effectively removing the single word.
  // It's applied iteratively to catch cases where removing one single word
  // might create another.
  let cleanedText = plainText;
  let prevLength = -1;
  while (cleanedText.length !== prevLength) {
    prevLength = cleanedText.length;
    cleanedText = cleanedText.replace(/\b\w+\b(?=\s|$)/g, (match) => {
      // Only remove if it's truly a standalone single word "paragraph"
      // In a flattened string, this means a single word followed by a space or end of string
      // and not part of a larger phrase.
      // A simpler approach is to filter after splitting into "sentences" or meaningful chunks.
      // For now, let's focus on removing single words that are isolated by significant whitespace.
      // Re-evaluating: The previous regex was too aggressive. Let's split by sentence-like structures
      // and then filter single words.
      return match.length > 1 ? match : ''; // Keep words longer than 1 char
    }).replace(/\s\s+/g, ' ').trim();
  }
  
  // A more robust way to handle single-word paragraphs after flattening:
  // Split by common sentence/phrase delimiters, then filter.
  const sentences = cleanedText.split(/([.!?]\s*|\n\s*)/).filter(Boolean);
  const filteredSentences = sentences.filter(sentence => {
    const words = sentence.trim().split(/\s+/);
    return words.length > 1 || words[0].length > 1; // Keep if more than one word, or if single word is long
  });
  
  return filteredSentences.join(' ').replace(/\s\s+/g, ' ').trim();
};