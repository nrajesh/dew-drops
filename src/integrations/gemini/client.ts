import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL_NAME;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY is not set.");
}

if (!MODEL_NAME) {
  throw new Error("VITE_GEMINI_MODEL_NAME is not set. Please specify a Gemini model (e.g., 'gemini-pro').");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

export const sendMessageToGemini = async (message: string) => {
  try {
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};