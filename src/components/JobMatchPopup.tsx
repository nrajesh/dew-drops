"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { usePortfolioContext } from "@/hooks/usePortfolioContext";
import { Loader2 } from "lucide-react";
import { calculateWeightedMatchPercentage } from "@/utils/cosineSimilarity"; // Import the new utility
import type { JsonResume } from "@/types/resume"; // Import JsonResume type

interface JobMatchPopupProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMatchRequest: (jobDescription: string) => void;
}

export const JobMatchPopup = ({ isOpen, onOpenChange, onMatchRequest }: JobMatchPopupProps) => {
  const [jobDescription, setJobDescription] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<{ percentage: number; reasoning: string; breakdown: { experience: number; education: number; skills: number } } | null>(null);
  const navigate = useNavigate();
  const { chatbotKnowledge, resume, loading: contextLoading, error: contextError } = usePortfolioContext();

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

  const generateReasoning = (totalPercentage: number, breakdown: { experience: number; education: number; skills: number }): string => {
    let reason = `This is a **${totalPercentage.toFixed(0)}%** overall match.`;
    reason += `\n\n**Breakdown:**\n`;
    reason += `- **Experience:** ${breakdown.experience.toFixed(0)}%\n`;
    reason += `- **Education:** ${breakdown.education.toFixed(0)}%\n`;
    reason += `- **Skills:** ${breakdown.skills.toFixed(0)}%\n\n`;

    if (totalPercentage >= 70) {
      reason += `Rajesh's profile shows a strong alignment with the job's requirements, particularly in areas of experience.`;
    } else if (totalPercentage >= 40) {
      reason += `There's a moderate alignment. While some areas match well, others might require further development or a more tailored approach.`;
    } else {
      reason += `The overall alignment is lower. This suggests the role might require a different set of core competencies or a significant upskilling effort.`;
    }
    return reason;
  };

  const handleSubmit = async () => {
    if (jobDescription.length < 80) {
      showError("Please enter at least 80 characters for a meaningful match.");
      return;
    }

    if (!resume || contextError) {
      showError("Resume data is not available for matching. Please ensure VITE_RESUME_URL is set and accessible.");
      return;
    }

    setIsMatching(true);

    try {
      // Prepare CV sections for weighted similarity
      const cvSections = {
        experience: resume.work?.map(w => `${w.position} at ${w.company} ${w.summary} ${w.highlights?.join(' ')}`).join(' ') || '',
        education: resume.education?.map(e => `${e.studyType} in ${e.area} from ${e.institution} ${e.courses?.join(' ')}`).join(' ') || '',
        skills: resume.skills?.map(s => `${s.name} ${s.level} ${s.keywords?.join(' ')}`).join(' ') || '',
      };

      const { totalPercentage, breakdown } = calculateWeightedMatchPercentage(jobDescription, cvSections);

      // Generate reasoning
      const reasoning = generateReasoning(totalPercentage, breakdown);

      // Set the match result
      setMatchResult({ percentage: totalPercentage, reasoning, breakdown });
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
            Enter your job description to see if Rajesh is a good fit for the role.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {matchResult ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{matchResult.percentage.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground mt-1">Match Percentage</p>
              </div>
              <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
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