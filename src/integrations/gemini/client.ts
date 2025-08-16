import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  // This error is caught by the Chat component, which will display a helpful message.
  throw new Error("VITE_GEMINI_API_KEY is not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const sendMessageToGemini = async (message: string) => {
  try {
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw new Error("Failed to get a response from the chatbot. Check the console for details.");
  }
};