import { sendMessageToGemini } from "@/integrations/gemini/client";

interface JobDescriptionAnalysisResult {
  isValidJobDescription: boolean;
  originalLanguage: string;
  processedText: string; // English translation or original English text
}

/**
 * Analyzes a given text to determine if it's a formal job description,
 * detects its language, and translates it to English if necessary.
 *
 * @param jobDescriptionText The text to analyze.
 * @returns A promise that resolves to a JobDescriptionAnalysisResult object.
 * @throws An error if the text is not a formal job description or if AI processing fails.
 */
export const analyzeAndTranslateJobDescription = async (
  jobDescriptionText: string
): Promise<JobDescriptionAnalysisResult> => {
  const prompt = `You are an expert AI assistant for analyzing job descriptions.
Your task is to first determine if the provided text is a formal job description.
If it is NOT a formal job description, respond ONLY with "INVALID_JOB_DESCRIPTION".
If it IS a formal job description:
1. Detect its original language.
2. If the language is NOT English, translate the entire job description into English.
3. If the language IS English, return the original text.

Your final output should be in JSON format with the following structure:
{
  "isValidJobDescription": boolean,
  "originalLanguage": string, // e.g., "en", "fr", "de"
  "processedText": string // The English translation or original English text, or "INVALID_JOB_DESCRIPTION" if not a JD
}

Example 1 (Not a JD):
Text: "Hello, how are you today?"
Output:
{
  "isValidJobDescription": false,
  "originalLanguage": "en",
  "processedText": "INVALID_JOB_DESCRIPTION"
}

Example 2 (English JD):
Text: "We are looking for a Software Engineer with 5+ years of experience in React."
Output:
{
  "isValidJobDescription": true,
  "originalLanguage": "en",
  "processedText": "We are looking for a Software Engineer with 5+ years of experience in React."
}

Example 3 (French JD):
Text: "Nous recherchons un Ingénieur Logiciel avec 5+ ans d'expérience en React."
Output:
{
  "isValidJobDescription": true,
  "originalLanguage": "fr",
  "processedText": "We are looking for a Software Engineer with 5+ years of experience in React."
}

Now, analyze the following text:
TEXT:
${jobDescriptionText}
`;

  try {
    const rawResponse = await sendMessageToGemini(prompt);
    let jsonString = rawResponse.replace(/```json\n([\s\S]*?)\n```/, '$1').trim();

    try {
      const result: JobDescriptionAnalysisResult = JSON.parse(jsonString);
      if (!result.isValidJobDescription && result.processedText === "INVALID_JOB_DESCRIPTION") {
        throw new Error("The provided text does not appear to be a formal job description. Please ensure you paste a formal job description.");
      }
      return result;
    } catch (parseError) {
      console.warn("Initial JSON parse failed, attempting to sanitize and re-parse.", parseError);
      console.warn("Problematic raw AI response:", rawResponse);

      // Attempt to fix common JSON issues:
      // 1. Remove control characters from the entire string
      // eslint-disable-next-line no-control-regex
      jsonString = jsonString.replace(/[\x00-\x1f\x7f-\x9f]/g, '');

      // 2. Try to extract fields using regex as a fallback
      const isValidJobDescriptionMatch = jsonString.match(/"isValidJobDescription":\s*(true|false)/);
      const originalLanguageMatch = jsonString.match(/"originalLanguage":\s*"([^"]*)"/);

      if (isValidJobDescriptionMatch && originalLanguageMatch) {
        const isValidJobDescription = isValidJobDescriptionMatch[1] === 'true';
        const originalLanguage = originalLanguageMatch[1];

        // Attempt to extract processedText more leniently
        const processedTextStartTag = '"processedText": "';
        const processedTextStartIndex = jsonString.indexOf(processedTextStartTag);

        let extractedProcessedText = "";
        if (processedTextStartIndex !== -1) {
          let potentialText = jsonString.substring(processedTextStartIndex + processedTextStartTag.length);

          // Find the last unescaped double quote that would be the end of the string value
          let lastQuoteIndex = -1;
          for (let i = potentialText.length - 1; i >= 0; i--) {
            if (potentialText[i] === '"' && (i === 0 || potentialText[i - 1] !== '\\')) {
              lastQuoteIndex = i;
              break;
            }
          }

          if (lastQuoteIndex !== -1) {
            extractedProcessedText = potentialText.substring(0, lastQuoteIndex);
          } else {
            // If no closing quote found, take the rest of the string and clean it
            extractedProcessedText = potentialText;
          }

          // Now, sanitize this extracted content for any problematic characters
          // eslint-disable-next-line no-control-regex
          extractedProcessedText = extractedProcessedText.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
          // Unescape already escaped quotes
          extractedProcessedText = extractedProcessedText.replace(/\\"/g, '"');
        }

        if (!isValidJobDescription && extractedProcessedText === "INVALID_JOB_DESCRIPTION") {
          throw new Error("The provided text does not appear to be a formal job description. Please ensure you paste a formal job description.");
        }

        return {
          isValidJobDescription,
          originalLanguage,
          processedText: extractedProcessedText
        };
      }

      // If all fallback attempts fail, re-throw the original parsing error.
      throw parseError;
    }
  } catch (error: any) {
    console.error("Error during job description analysis and translation:", error);
    if (error.message.includes("JSON.parse")) {
      throw new Error("Failed to parse AI response for job description analysis. Please try again.");
    }
    throw error;
  }
};