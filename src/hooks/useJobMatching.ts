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

const analysisSteps = [
  "Extracting Key Criteria",
  "Text Preprocessing",
  "Vectorization & Similarity Calculation",
  "Keyword Matching & Gap Analysis",
  "Finalizing Profile Match",
];

export const useJobMatching = () => {
  const { chatbotKnowledge, resume, loading: contextLoading, error: contextError } = usePortfolioContext();
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [geminiClientError, setGeminiClientError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // New state for current step

  useEffect(() => {
    // Check if sendMessageToGemini is available, if not, set an error
    if (typeof sendMessageToGemini !== 'function') {
      setGeminiClientError("Gemini client is not initialized. Check VITE_GEMINI_API_KEY and VITE_GEMINI_MODEL_NAME.");
    }
  }, []);

  const performJobMatch = useCallback(async (jobDescription: string) => {
    if (contextLoading) {
      throw new Error("Portfolio context is still loading. Please wait.");
    }
    if (!resume || contextError || geminiClientError) {
      throw new Error(contextError || geminiClientError || "Resume data or Gemini client not available.");
    }
    

    setIsMatching(true);
    setMatchResult(null); // Clear previous result
    setCurrentStepIndex(0); // Reset step index

    try {
      const result = await generateJobMatchReasoning(
        jobDescription,
        chatbotKnowledge,
        resume,
        sendMessageToGemini,
        setCurrentStepIndex // Pass the step update callback
      );
      setMatchResult(result);
      return result;
    } catch (error: any) {
      console.error("Error performing job match:", error);
      throw error;
    } finally {
      setIsMatching(false);
      setCurrentStepIndex(0); // Reset after completion or error
    }
  }, [chatbotKnowledge, resume, contextError, contextLoading, geminiClientError]);

  const resetMatch = useCallback(() => {
    setMatchResult(null);
    setCurrentStepIndex(0); // Reset step index on reset
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