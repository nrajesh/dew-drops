"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { usePortfolioContext } from "@/hooks/usePortfolioContext";
import { Loader2 } from "lucide-react";
import { calculateCosineSimilarity } from "@/utils/cosineSimilarity"; // Import the new utility
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import remarkGfm for GitHub Flavored Markdown
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { Progress } from "@/components/ui/progress"; // Import Progress component

let sendMessageToGemini: (message: string) => Promise<string>; // Declare Gemini function

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
  const [progress, setProgress] = useState(0); // New state for progress
  const navigate = useNavigate();
  const { context, loading: contextLoading, error: contextError } = usePortfolioContext();
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  useEffect(() => {
    const initGemini = async () => {
      try {
        const module = await import('@/integrations/gemini/client');
        sendMessageToGemini = module.sendMessageToGemini;
      } catch (error: any) {
        setApiKeyError(error.message);
      }
    };
    initGemini();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when popup is closed
      setJobDescription("");
      setIsButtonEnabled(false);
      setIsMatching(false);
      setMatchResult(null);
      setProgress(0); // Reset progress
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setIsButtonEnabled(value.length >= 80);
  };

  const generateReasoning = async (description: string, context: string, matchPercentage: number): Promise<string> => {
    if (!sendMessageToGemini) throw new Error("Chat client is not initialized.");

    const systemPrompt = `You are a world-class hiring manager analyzing a job description against a candidate's profile.
    Job Description: ${description}
    Candidate Profile: ${context}
    Match Percentage: ${matchPercentage.toFixed(0)}%

    Based on the job description and the candidate's profile, perform a keyword matching and gap analysis.
    Provide a concise reasoning (2-3 sentences) explaining why this is a ${matchPercentage.toFixed(0)}% match or why it isn't.
    If the match is high, highlight specific skills or experiences that align.
    If the match is low, suggest areas where the candidate might need to improve or where the job description might need to be adjusted.
    Be professional and constructive in your assessment.`;

    const response = await sendMessageToGemini(systemPrompt);
    return response;
  };

  const handleSubmit = async () => {
    if (jobDescription.length < 80) {
      showError("Please enter at least 80 characters for a meaningful match.");
      return;
    }

    if (!context || contextError) {
      showError("Knowledge base is not available for matching.");
      return;
    }
    if (apiKeyError) {
      showError(`AI service configuration error: ${apiKeyError}`);
      return;
    }

    setIsMatching(true);
    setProgress(10); // Start progress

    try {
      // Calculate match percentage using cosine similarity
      const matchPercentage = calculateCosineSimilarity(jobDescription, context);
      setProgress(50); // After client-side calculation

      // Generate reasoning using Gemini for keyword matching and gap analysis
      const reasoning = await generateReasoning(jobDescription, context, matchPercentage);
      setProgress(100); // After AI response

      // Set the match result
      setMatchResult({ percentage: matchPercentage, reasoning });
    } catch (error: any) {
      console.error("Error in job matching:", error);
      showError("Sorry, an error occurred while analyzing the job description. Please try again later.");
      setProgress(0); // Reset progress on error
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
    setProgress(0); // Reset progress
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
          {isMatching && !matchResult ? (
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing your job description...</p>
              <Progress value={progress} className="w-full" />
            </div>
          ) : matchResult ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{matchResult.percentage.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground mt-1">Match Percentage</p>
              </div>
              <ScrollArea className="h-48 bg-muted p-4 rounded-lg prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {matchResult.reasoning}
                </ReactMarkdown>
              </ScrollArea>
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
              disabled={!isButtonEnabled || isMatching || contextLoading || apiKeyError !== null}
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