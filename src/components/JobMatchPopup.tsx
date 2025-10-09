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
  const navigate = useNavigate();
  const { context, loading: contextLoading, error: contextError } = usePortfolioContext();

  useEffect(() => {
    if (!isOpen) {
      // Reset state when popup is closed
      setJobDescription("");
      setIsButtonEnabled(false);
      setIsMatching(false);
      setMatchResult(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setIsButtonEnabled(value.length >= 80);
  };

  const generateReasoning = (description: string, context: string, matchPercentage: number): string => {
    // Simple reasoning generation based on match percentage
    if (matchPercentage >= 70) {
      return `This is a strong match (${matchPercentage.toFixed(0)}%) because the job description aligns well with Rajesh's skills and experiences.`;
    } else if (matchPercentage >= 40) {
      return `This is a moderate match (${matchPercentage.toFixed(0)}%). While there are some relevant skills, there may be areas where Rajesh's experience could be enhanced to better fit the role.`;
    } else {
      return `This is a low match (${matchPercentage.toFixed(0)}%). The job description may require skills or experiences that Rajesh doesn't currently have, or may need significant adjustments to align with the role.`;
    }
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

    setIsMatching(true);

    try {
      // Calculate match percentage using cosine similarity
      const matchPercentage = calculateCosineSimilarity(jobDescription, context);

      // Generate reasoning
      const reasoning = generateReasoning(jobDescription, context, matchPercentage);

      // Set the match result
      setMatchResult({ percentage: matchPercentage, reasoning });
    } catch (error: any) {
      console.error("Error in job matching:", error);
      showError("Sorry, an error occurred while analyzing the job description. Please try again later.");
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
          {matchResult ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{matchResult.percentage.toFixed(0)}%</p>
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