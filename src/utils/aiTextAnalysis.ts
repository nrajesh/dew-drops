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
  jobDescriptionText: string,
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
  "processedText": string // The English translation or original English text, or "INVALID_JOB_DESCRIPTION" if not a JD. Ensure this string is JSON-escaped (e.g., double quotes are \\" and newlines are \\n).
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
    // Gemini might sometimes wrap JSON in markdown code blocks, so we need to extract it.
    const jsonString = rawResponse
      .replace(/```json\n([\s\S]*?)\n```/, "$1")
      .trim();

    const result: JobDescriptionAnalysisResult = JSON.parse(jsonString);

    if (
      !result.isValidJobDescription &&
      result.processedText === "INVALID_JOB_DESCRIPTION"
    ) {
      throw new Error(
        "The provided text does not appear to be a formal job description. Please ensure you paste a formal job description.",
      );
    }

    return result;
  } catch (error: unknown) {
    console.error(
      "Error during job description analysis and translation:",
      error,
    );
    if (error instanceof Error && error.message.includes("JSON.parse")) {
      throw new Error(
        "Failed to parse AI response for job description analysis. Please try again.",
      );
    }
    throw error;
  }
};

/**
 * Analyzes a vision-based job description (image) to determine if it's a formal JD.
 *
 * @param base64Image The base64 encoded image.
 * @returns A promise that resolves to a JobDescriptionAnalysisResult object.
 */
export const analyzeVisionJobDescription = async (
  base64Image: string,
): Promise<JobDescriptionAnalysisResult> => {
  const prompt = `You are an expert AI assistant for analyzing job descriptions from images.
Determine if the provided image is a formal job description.

Your final output MUST be in JSON format:
{
  "isValidJobDescription": boolean,
  "originalLanguage": "en",
  "processedText": "The detected text from the image (brief summary)" 
}

If it is NOT a formal job description:
- Set "isValidJobDescription" to false.
- Set "processedText" to "INVALID_JOB_DESCRIPTION".`;

  try {
    const { sendMessageToGeminiWithImage } = await import("@/integrations/gemini/client");
    const rawResponse = await sendMessageToGeminiWithImage(prompt, base64Image);
    
    // Extract JSON from potential markdown blocks
    const extractJson = (text: string) => {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      if (match) return match[1].trim();
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return text.substring(firstBrace, lastBrace + 1).trim();
      }
      return text.trim();
    };

    const jsonString = extractJson(rawResponse);
    const result: JobDescriptionAnalysisResult = JSON.parse(jsonString);

    if (!result.isValidJobDescription) {
      throw new Error(
        "The provided image does not appear to be a formal job description. Please upload a clear screenshot of a job post.",
      );
    }

    return result;
  } catch (error: unknown) {
    console.error("Error during vision job description analysis:", error);
    if (error instanceof Error && (error.message.includes("JSON.parse") || error.message.includes("malformed"))) {
      throw new Error("Failed to verify image content. Please ensure the screenshot is clear and try again.");
    }
    throw error;
  }
};
