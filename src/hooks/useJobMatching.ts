// src/hooks/useJobMatching.ts
import { useState, useCallback, useEffect, useMemo } from "react";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { generateJobMatchReasoning } from "@/utils/jobMatchUtils";
import { sendMessageToGemini, getGeminiInitializationError } from "@/integrations/gemini/client";
import { showError } from "@/utils/toast";

interface JobMatchResult {
  percentage: number;
  reasoning: string;
  // breakdown removed
}

export const analysisSteps = [
  "Extracting Key Criteria",
  "Text Preprocessing",
  "Skill & Experience Mapping",
  "Gap Identification & Soft Skill Leverage",
  "Generating Match Results",
];

export const useJobMatching = () => {
  const { chatbotKnowledge, resume, loading: contextLoading, error: contextError } = usePortfolioData();
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [geminiClientError, setGeminiClientError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const initError = getGeminiInitializationError();
    if (initError) {
      setGeminiClientError(initError);
    } else {
      setGeminiClientError(null);
    }
  }, []);

  const getErrorMessage = (error: any): string => {
    if (error instanceof Error && error.message) {
      if (error.message.includes("API key not valid")) {
        return "Gemini API key is not valid. Please check VITE_GEMINI_API_KEY.";
      } else if (error.message.includes("The model is overloaded") || (error.message.includes("503") && error.message.includes("generateContent"))) {
        return "The AI service is currently busy. Please try again in a few moments.";
      } else if (error.message.includes("400") && error.message.includes("Bad Request")) {
        return "The request to the AI model was malformed. This might be a temporary issue or an invalid prompt.";
      } else if (error.message.includes("429") || error.message.includes("rate limit")) {
        return "You've hit the AI service rate limit. Please wait a moment and try again.";
      } else if (error.message.includes("VITE_GEMINI_API_KEY is not set") || error.message.includes("VITE_GEMINI_MODEL_NAME is not set")) {
        return "AI service is not configured. Please ensure VITE_GEMINI_API_KEY and VITE_GEMINI_MODEL_NAME are set.";
      } else if (error.message.includes("Failed to parse JSON response from AI")) {
        return "The AI returned an unexpected response format. Please try again.";
      } else if (error.message.includes("The provided text does not appear to be a formal job description")) {
        return error.message; // Specific error from analyzeAndTranslateJobDescription
      }
      return error.message; // Use the specific error message if none of the above match
    } else if (typeof error === 'string') {
      return `AI analysis error: ${error}`;
    }
    return "Sorry, an unexpected error occurred during AI analysis. Please try again later.";
  };

  const performJobMatch = useCallback(async (jobDescription: string) => {
    if (contextLoading) {
      throw new Error("Portfolio context is still loading. Please wait.");
    }
    if (!resume) {
      throw new Error("Resume data is not available for matching. Please ensure VITE_RESUME_URL is set and accessible.");
    }
    if (contextError) {
      throw new Error(contextError);
    }
    if (geminiClientError) {
      throw new Error(geminiClientError);
    }

    setIsMatching(true);
    setMatchResult(null);
    setCurrentStepIndex(0);

    try {
      const { percentage, reasoning } = await generateJobMatchReasoning(
        jobDescription,
        chatbotKnowledge,
        resume,
        sendMessageToGemini,
        setCurrentStepIndex
      );
      setMatchResult({ percentage, reasoning });
      return { percentage, reasoning };
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      showError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsMatching(false);
      setCurrentStepIndex(0);
    }
  }, [chatbotKnowledge, resume, contextError, contextLoading, geminiClientError]);

  const resetMatch = useCallback(() => {
    setMatchResult(null);
    setCurrentStepIndex(0);
  }, []);

  return {
    isMatching,
    matchResult,
    performJobMatch,
    resetMatch,
    contextLoading,
    contextError,
    geminiClientError,
    resume,
    chatbotKnowledge,
    currentStepIndex,
    currentStepTitle: analysisSteps[currentStepIndex],
    totalSteps: analysisSteps.length,
  };
};