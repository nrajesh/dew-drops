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
  const normalized = decodedName.normalize("NFD");

  // Remove the diacritical marks.
  const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, "");

  // Replace whitespace with a single underscore.
  const withUnderscores = withoutDiacritics.replace(/\s+/g, "_");

  // Remove any character that is not a letter, number, underscore, dot, or hyphen.
  // This is a very safe character set for filenames.
  const sanitized = withUnderscores.replace(/[^a-zA-Z0-9_.-]/g, "");

  // Remove leading/trailing underscores or dots.
  const finalName = sanitized.replace(/^[_.]+|[_.]+$/g, "");

  // Ensure the filename is not empty after sanitization.
  return finalName || "sanitized_file";
}

export function generateAltTextFromFileName(fileName: string): string {
  if (!fileName) return "";

  // Get the part of the filename after the last '/'
  const namePart = fileName.split("/").pop() || fileName;

  // Find the first underscore (which separates the timestamp from the original name)
  const firstUnderscoreIndex = namePart.indexOf("_");

  // If an underscore is found, take the substring after it. Otherwise, use the whole name part.
  const originalFileName =
    firstUnderscoreIndex !== -1
      ? namePart.substring(firstUnderscoreIndex + 1)
      : namePart;

  // Remove the file extension and replace underscores with spaces.
  return originalFileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
}

/**
 * Builds a brief, consistent on-screen summary from full reasoning markdown.
 * Shows a limited number of bullets per section so the UI stays clean;
 * full details remain in PDF/Text downloads.
 */
export const reasoningToBriefSummary = (
  markdown: string,
  options?: { matchingBullets?: number; gapsBullets?: number },
): string => {
  const matchingMax = options?.matchingBullets ?? 3;
  const gapsMax = options?.gapsBullets ?? 2;
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inMatching = false;
  let inGaps = false;
  let matchingCount = 0;
  let gapsCount = 0;

  for (const line of lines) {
    if (line.startsWith("## Matching Areas")) {
      inMatching = true;
      inGaps = false;
      out.push(line);
      continue;
    }
    if (line.startsWith("## Gaps")) {
      inMatching = false;
      inGaps = true;
      out.push(line);
      continue;
    }
    if (inMatching) {
      if (line.trim().startsWith("+ ") || line.trim().startsWith("- ")) {
        if (matchingCount < matchingMax) {
          out.push(line);
          matchingCount++;
        }
      } else if (line.trim().length === 0 || !line.trim().startsWith("##")) {
        out.push(line);
      }
    } else if (inGaps) {
      if (line.trim().startsWith("- ") || line.trim().startsWith("+ ")) {
        if (gapsCount < gapsMax) {
          out.push(line);
          gapsCount++;
        }
      } else if (line.trim().length === 0 || !line.trim().startsWith("##")) {
        out.push(line);
      }
    }
  }

  out.push("");
  out.push("*Download as Text or PDF for the full matching areas and gaps.*");
  return out.join("\n");
};

/**
 * Parses reasoning markdown into two clean bullet arrays.
 * Returns up to `matchingMax` matching bullets and `gapsMax` gap bullets,
 * with the leading `+` / `- ` prefix stripped, for direct JSX rendering.
 */
export const parseReasoningSections = (
  markdown: string,
  options?: { matchingMax?: number; gapsMax?: number },
): { matchingLines: string[]; gapLines: string[] } => {
  const matchingMax = options?.matchingMax ?? 3;
  const gapsMax = options?.gapsMax ?? 2;

  // Normalise: the AI sometimes returns literal "\\n" sequences instead of
  // actual newlines — convert them so .split('\n') works consistently.
  const normalised = markdown.replace(/\\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  const lines = normalised.split("\n");
  const matchingLines: string[] = [];
  const gapLines: string[] = [];
  let inMatching = false;
  let inGaps = false;

  for (const line of lines) {
    if (line.startsWith("## Matching Areas")) {
      inMatching = true;
      inGaps = false;
      continue;
    }
    if (line.startsWith("## Gaps")) {
      inMatching = false;
      inGaps = true;
      continue;
    }
    if (inMatching && matchingLines.length < matchingMax) {
      const stripped = line.replace(/^\s*[+-]\s*/, "").trim();
      if (stripped.length > 0) matchingLines.push(stripped);
    } else if (inGaps && gapLines.length < gapsMax) {
      const stripped = line.replace(/^\s*[+-]\s*/, "").trim();
      if (stripped.length > 0) gapLines.push(stripped);
    }
  }

  return { matchingLines, gapLines };
};

/**
 * Helper function to limit gaps in markdown output for display
 * to a maximum of 3 bullet points in the 'Gaps' section.
 */
export const limitGapsInMarkdown = (markdown: string): string => {
  const lines = markdown.split("\n");
  let inGapsSection = false;
  let gapCount = 0;
  const newLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## Gaps")) {
      inGapsSection = true;
      newLines.push(line);
      continue;
    }

    if (inGapsSection) {
      // If it's a bullet point for a gap
      if (line.trim().startsWith("- ") || line.trim().startsWith("+ ")) {
        if (gapCount < 3) {
          // This is the limit
          newLines.push(line);
          gapCount++;
        }
      } else if (line.trim().length > 0 && !line.trim().startsWith("##")) {
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
  return newLines.join("\n");
};

/**
 * Helper function to convert markdown to plain text for download,
 * removing markdown formatting like headings, bold, and italics.
 */
export const markdownToPlainText = (markdown: string): string => {
  let plainText = markdown;
  // Remove headings (e.g., ## Matching Areas)
  plainText = plainText.replace(/^#+\s/gm, "");
  // Remove bold/italic markers
  plainText = plainText.replace(/\*\*([^*]+?)\*\*/g, "$1"); // **bold** -> bold
  plainText = plainText.replace(/\*([^*]+?)\*/g, "$1"); // *italic* -> italic
  plainText = plainText.replace(/_([^_]+?)_/g, "$1"); // _italic_ -> italic
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
  const doc = new DOMParser().parseFromString(text, "text/html");
  let plainText = doc.body.textContent || "";

  // 2. Remove specific LinkedIn boilerplate text more robustly
  // This regex targets the common start and end phrases of the LinkedIn privacy banner
  const linkedInBoilerplateRegex =
    /LinkedIn\s*respects\s*your\s*privacy[\s\S]*?(?:Skip\s*to\s*main\s*content|You\s*can\s*update\s*your\s*choices\s*at\s*any\s*time\s*in\s*your\s*settings\.)/gi;
  plainText = plainText.replace(linkedInBoilerplateRegex, "");

  // 3. Replace all newlines with a single space, then normalize multiple spaces
  plainText = plainText
    .replace(/(\r\n|\n|\r)/g, " ")
    .replace(/\s\s+/g, " ")
    .trim();

  // 4. Split the text into words and filter out single-character words or very short words
  const words = plainText.split(/\s+/);
  const filteredWords = words.filter((word) => word.length > 1); // Keep words longer than 1 character

  return filteredWords.join(" ").trim();
};

/**
 * Formats a date string into a human-readable format (e.g., "Month Day, Year").
 * @param dateString The date string to format.
 * @param options Optional Intl.DateTimeFormatOptions for custom formatting.
 * @returns The formatted date string, or an empty string if null/invalid.
 */
export const formatDate = (
  dateString: string | null,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!dateString) return "";
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(
      "en-US",
      options || defaultOptions,
    );
  } catch {
    return dateString; // Fallback for invalid date strings
  }
};

/**
 * Normalizes a tag string to Unicode Normalization Form C (NFC) and trims whitespace.
 * This helps ensure consistent representation and comparison of tags, especially with Unicode characters.
 * It also attempts to decode URI components, in case the tag is URL-encoded.
 * @param tag The tag string to normalize.
 * @returns The normalized and trimmed tag string.
 */
export const normalizeTag = (tag: string): string => {
  let decodedTag = tag;
  try {
    // Attempt to decode URI components first, in case the tag is URL-encoded
    decodedTag = decodeURIComponent(tag);
  } catch (e) {
    // If decoding fails (e.g., not a valid URI sequence), use the original tag
    console.warn("Failed to decode URI component for tag:", tag, e);
  }
  return decodedTag.normalize("NFC").trim();
};
