import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;
let initializationError: string | null = null;

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL_NAME;

try {
  if (!API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not set.");
  }
  if (!MODEL_NAME) {
    throw new Error(
      "VITE_GEMINI_MODEL_NAME is not set. Please specify a Gemini model (e.g., 'gemini-pro').",
    );
  }
  genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: MODEL_NAME });
} catch (e: unknown) {
  const err = e as Error;
  initializationError = err.message;
  console.error("Gemini client initialization error:", err);
}

export const getGeminiModel = (): GenerativeModel => {
  if (initializationError) {
    throw new Error(initializationError);
  }
  if (!model) {
    throw new Error("Gemini model is not initialized. Check configuration.");
  }
  return model;
};

export const getGeminiInitializationError = () => initializationError;

export const sendMessageToGemini = async (message: string) => {
  try {
    const currentModel = getGeminiModel();
    const result = await currentModel.generateContent(message);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error: unknown) {
    const e = error as Error;
    console.error("Error interacting with Gemini:", e);

    throw new Error(e.message || "Failed to communicate with AI service");
  }
};

export const extractJobKeywords = async (
  jobDescription: string,
): Promise<string[]> => {
  try {
    const currentModel = getGeminiModel();
    const prompt = `Given the following job description, extract 5-10 key skills, technologies, and responsibilities as a comma-separated list. Only return the keywords, nothing else.
    Job Description: ${jobDescription}
    Example: 'React, TypeScript, Node.js, AWS, Agile, Leadership, Problem-solving, Communication'`;

    const result = await currentModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  } catch (error) {
    console.error("Error extracting job keywords with Gemini:", error);
    throw error;
  }
};

/**
 * Analyzes an image and generates descriptive tags.
 * @param base64Image The base64 encoded image string (including data:image/jpeg;base64,... prefix)
 * @param prompt The prompt to guide the analysis
 * @returns A promise that resolves to an array of tags
 */
export const analyzeImage = async (
  base64Image: string,
  prompt: string = "Generate a comma-separated list of 5-10 descriptive and specific tags for this image. Only return the tags, nothing else.",
): Promise<string[]> => {
  try {
    const currentModel = getGeminiModel();

    const isBase64 = base64Image.startsWith("data:");

    if (!isBase64) {
      console.warn(
        "analyzeImage received a non-base64 string. Gemini requires base64 data for inline images. Attempting to use as raw text (may fail).",
      );
      // If it's not base64, we can't easily send it as an image to Gemini via inlineData.
      // We'll just send the prompt and hope for the best or it will fail as it did before.
      const result = await currentModel.generateContent([prompt]);
      const response = await result.response;
      return response
        .text()
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    }

    // Extract base64 content and mime type
    const mimeType =
      base64Image.match(/data:([^;]+);base64/)?.[1] || "image/jpeg";
    const base64Data = base64Image.replace(/^data:[^;]+;base64,/, "");

    const result = await currentModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    return text
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
  } catch (error: unknown) {
    const e = error as Error;
    console.error("Error analyzing image with Gemini:", e);
    throw new Error(e.message || "Failed to analyze image");
  }
};
export const sendMessageToGeminiWithImage = async (
  prompt: string,
  base64Image: string,
) => {
  try {
    const currentModel = getGeminiModel();
    const mimeType =
      base64Image.match(/data:([^;]+);base64/)?.[1] || "image/jpeg";
    const base64Data = base64Image.replace(/^data:[^;]+;base64,/, "");

    const result = await currentModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    return response.text();
  } catch (error: unknown) {
    const e = error as Error;
    console.error("Error interacting with Gemini Vision:", e);
    throw new Error(
      e.message || "Failed to communicate with AI Vision service",
    );
  }
};

export const fetchUrlContentWithJina = async (url: string): Promise<string> => {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl);
    if (!response.ok) {
      throw new Error(`Jina Reader failed with status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error("Jina Reader error:", error);
    throw new Error("Failed to fetch clean content from the provided URL.");
  }
};

export const isLocalFilePath = (input: string): boolean => {
  const localPathRegex = /^(\/|[a-zA-Z]:\\|~\/)/;
  return localPathRegex.test(input.trim());
};
