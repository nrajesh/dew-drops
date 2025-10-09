// src/hooks/useJobMatching.ts
import { useState, useCallback, useEffect } from "react";
import { usePortfolioContext } from "@/hooks/usePortfolioContext";
import { generateJobMatchReasoning } from "@/utils/jobMatchUtils";
import { sendMessageToGemini } from "@/integrations/gemini/client"; // Assuming this is available globally or passed

interface JobMatchResult {
  percentage: number;
  reasoning: string;
  breakdown: { experience: number; education: number; skills: number };
}

export const useJobMatching = () => {
  const { chatbotKnowledge, resume, loading: contextLoading, error: contextError } = usePortfolioContext();
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [geminiClientError, setGeminiClientError] = useState<string | null>(null);

  useEffect(() => {
    // Check if sendMessageToGemini is available, if not, set an error
    if (typeof sendMessageToGemini !== 'function') {
      setGeminiClientError("Gemini client is not initialized. Check VITE_GEMINI_API_KEY and VITE_GEMINI_MODEL_NAME.");
    }
  }, []);

  const performJobMatch = useCallback(async (jobDescription: string) => {
    if (!resume || contextError || geminiClientError) {
      throw new Error(contextError || geminiClientError || "Resume data or Gemini client not available.");
    }
    if (contextLoading) {
      throw new Error("Portfolio context is still loading.");
    }

    setIsMatching(true);
    setMatchResult(null); // Clear previous result

    try {
      const result = await generateJobMatchReasoning(
        jobDescription,
        chatbotKnowledge,
        resume,
        sendMessageToGemini // Pass the function
      );
      setMatchResult(result);
      return result;
    } catch (error: any) {
      console.error("Error performing job match:", error);
      throw error;
    } finally {
      setIsMatching(false);
    }
  }, [chatbotKnowledge, resume, contextError, contextLoading, geminiClientError]);

  const resetMatch = useCallback(() => {
    setMatchResult(null);
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
  };
};