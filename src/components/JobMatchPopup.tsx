"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { usePortfolioContext } from "@/hooks/usePortfolioContext";
import { Loader2 } from "lucide-react";
import { calculateMatchPercentage } from "@/utils/pythonRunner";
import { sendMessageToGemini } from "@/integrations/gemini/client";

interface JobMatchPopupProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMatchRequest: (jobDescription: string) => void;
}

export const JobMatchPopup = ({ isOpen, onOpenChange, onMatchRequest }: JobMatchPopupProps) => {
  const [jobDescription, setJobDescription] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<{ percentage: number; reasoning: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { context, loading: contextLoading, error: contextError } = usePortfolioContext();

  useEffect(() => {
    if (!isOpen) {
      // Reset state when popup is closed
      setJobDescription("");
      setIsButtonEnabled(false);
      setIsMatching(false);
      setMatchResult(null);
      setError(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setIsButtonEnabled(value.length >= 80);
    setError(null); // Clear error when user starts typing
  };

  const generateReasoning = async (matchPercentage: number): Promise<string> => {
    if (!context || contextError) throw new Error("Knowledge base is not available.");

    // Use the chatbot to generate reasoning based on the match percentage
    const systemPrompt = `You are a world-class hiring manager analyzing a job description against a candidate's profile.
    Match Percentage: ${matchPercentage}%

    Provide a concise reasoning (2-3 sentences) explaining why this is a ${matchPercentage}% match or why it isn't.
    If the match is high, highlight specific skills or experiences that align.
    If the match is low, suggest areas where the candidate might need to improve or where the job description might need to be adjusted.
    Be professional and constructive in your assessment.

    CONTEXT:
    ---
    ${context}
    ---
    `;

    // Use the existing chatbot function to generate the reasoning
    const response = await sendMessageToGemini(systemPrompt);
    return response;
  };

  const handleSubmit = async () => {
    if (jobDescription.length < 80) {
      setError("Please enter at least 80 characters for a meaningful match.");
      return;
    }

    if (!context || contextError) {
      setError("Knowledge base is not available for matching.");
      return;
    }

    setIsMatching(true);
    setError(null);

    try {
      // Calculate match percentage using the new Python-based calculation
      const matchPercentage = await calculateMatchPercentage(context, jobDescription);

      // Generate reasoning
      const reasoning = await generateReasoning(matchPercentage);

      // Set the match result
      setMatchResult({ percentage: Math.round(matchPercentage), reasoning });
    } catch (error: any) {
      console.error("Error in job matching:", error);
      setError(error.message || "Sorry, an error occurred while analyzing the job description. Please try again later.");
      setMatchResult(null);
    } finally {
      setIsMatching(false);
    }
  };

  const handleContactClick = () => {
    onOpenChange(false);
    navigate("/contact");
  };

  const handleMatchAnother = () => {
    // Reset the match result to allow for a new match
    setMatchResult(null);
    setJobDescription("");
    setIsButtonEnabled(false);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Find Your Perfect Match</DialogTitle>
          <DialogDescription>
            Enter your job description to see if you're a good fit for the role.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {matchResult ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{matchResult.percentage}%</p>
                <p className="text-sm text-muted-foreground mt-1">Match Percentage</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">{matchResult.reasoning}</p>
              </div>
            </div>
          ) : (
            <>
              <Textarea
                placeholder="Describe the job you're applying for..."
                value={jobDescription}
                onChange={handleInputChange}
                className="min-h-[150px]"
                disabled={isMatching}
              />
              <p className="text-sm text-muted-foreground mt-2">
                {jobDescription.length}/80 characters minimum
              </p>
            </>
          )}
        </div>
        <DialogFooter className="flex flex-col gap-2">
          {matchResult ? (
            <>
              <Button
                onClick={handleMatchAnother}
                className="w-full"
              >
                Match Another Job Profile
              </Button>
              <Button
                variant="outline"
                onClick={handleContactClick}
                className="w-full"
              >
                Contact Me
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isButtonEnabled || isMatching}
              className="w-full"
            >
              {isMatching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Is Rajesh a Good Match?"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};