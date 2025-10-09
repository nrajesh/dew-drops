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

export const extractJobKeywords = async (jobDescription: string): Promise<string[]> => {
  try {
    const prompt = `Given the following job description, extract 5-10 key skills, technologies, and responsibilities as a comma-separated list. Only return the keywords, nothing else.
    Job Description: ${jobDescription}
    Example: 'React, TypeScript, Node.js, AWS, Agile, Leadership, Problem-solving, Communication'`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text.split(',').map(keyword => keyword.trim()).filter(Boolean);
  } catch (error) {
    console.error("Error extracting job keywords with Gemini:", error);
    throw error;
  }
};