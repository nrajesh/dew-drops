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
