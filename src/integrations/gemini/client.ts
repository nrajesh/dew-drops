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
    const prompt = `From the following job description, extract a comma-separated list of key skills, technologies, and requirements. Focus on technical skills, tools, and core competencies. Do not include soft skills unless explicitly stated as a core requirement. Return only the comma-separated list, no other text.

Job Description:
${jobDescription}

Example Output:
JavaScript, React, Node.js, AWS, SQL, Agile, REST APIs, Docker`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text.split(',').map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error("Error extracting job keywords with Gemini:", error);
    throw error;
  }
};