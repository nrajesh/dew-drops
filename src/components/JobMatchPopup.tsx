"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { usePortfolioContext } from "@/hooks/usePortfolioContext";
import { Loader2 } from "lucide-react";
import { calculateWeightedMatchPercentage } from "@/utils/cosineSimilarity";
import type { JsonResume } from "@/types/resume";
import { extractJobKeywords } from "@/integrations/gemini/client";
import ReactMarkdown from 'react-markdown';
import { AnalysisProgressBar } from "./AnalysisProgressBar"; // Import the new component

interface JobMatchPopupProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMatchRequest: (jobDescription: string) => void;
}

const ANALYSIS_STEPS = [
  "Extracting Key Criteria",
  "Text Preprocessing",
  "Vectorization",
  "Similarity Calculation",
  "Keyword Matching & Gap Analysis",
  "Weighted Scoring",
];

export const JobMatchPopup = ({ isOpen, onOpenChange, onMatchRequest }: JobMatchPopupProps) => {
  const [jobDescription, setJobDescription] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0); // New state for progress
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
      setCurrentAnalysisStep(0); // Reset progress
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setIsButtonEnabled(value.length >= 80);
  };

  const generateReasoning = (
    totalPercentage: number,
    breakdown: { experience: number; education: number; skills: number },
    jobRequirements: string[],
    cvSkills: string[]
  ): string => {
    let reason = `**Breakdown:**\n`;
    reason += `- **Experience:** ${breakdown.experience.toFixed(0)}%\n`;
    reason += `- **Education:** ${breakdown.education.toFixed(0)}%\n`;
    reason += `- **Skills:** ${breakdown.skills.toFixed(0)}%\n\n`;

    const jobReqSet = new Set(jobRequirements.map(s => s.toLowerCase()));
    const cvSkillsSet = new Set(cvSkills.map(s => s.toLowerCase()));

    const overlaps = Array.from(jobReqSet).filter(req => cvSkillsSet.has(req));
    const missing = Array.from(jobReqSet).filter(req => !cvSkillsSet.has(req));

    if (overlaps.length > 0) {
      reason += `**Key Overlapping Skills/Requirements:**\n- ${overlaps.join(', ')}\n\n`;
    }

    if (missing.length > 0) {
      reason += `**Missing Key Skills/Requirements:**\n- ${missing.join(', ')}\n\n`;
      reason += `**Actionable Feedback:**\n`;
      reason += `To improve alignment, consider highlighting experiences or projects where you've utilized these missing skills. If you have relevant experience not explicitly listed, ensure it's added to your CV. For skills you're developing, consider adding them to a "Learning" or "Future Skills" section, or gaining practical experience through projects.\n\n`;
    }

    if (totalPercentage >= 70) {
      reason += `Rajesh's profile shows a strong alignment with the job's requirements, particularly in areas of experience.`;
    } else if (totalPercentage >= 40) {
      reason += `There's a moderate alignment. While some areas match well, others might require further development or a more tailored approach.`;
    } else {
      reason += `The overall alignment is lower. This suggests the role might require a different set of core competencies or a significant upskilling effort.`;
    }
    
    // Trim multiple consecutive newlines to a maximum of two for better formatting
    return reason.replace(/\n{3,}/g, '\n\n').trim();
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
    setCurrentAnalysisStep(0); // Start progress

    try {
      // Step 1: Extracting Key Criteria
      setCurrentAnalysisStep(1);
      const jobRequirements = await extractJobKeywords(jobDescription);

      // Step 2: Text Preprocessing (implicitly done before vectorization)
      setCurrentAnalysisStep(2);
      const cvSections = {
        experience: resume.work?.map(w => `${w.position} at ${w.company} ${w.summary} ${w.highlights?.join(' ')}`).join(' ') || '',
        education: resume.education?.map(e => `${e.studyType} in ${e.area} from ${e.institution} ${e.courses?.join(' ')}`).join(' ') || '',
        skills: resume.skills?.map(s => `${s.name} ${s.level} ${s.keywords?.join(' ')}`).join(' ') || '',
      };

      // Step 3: Vectorization (happens inside calculateWeightedMatchPercentage)
      setCurrentAnalysisStep(3);
      const { totalPercentage, breakdown } = calculateWeightedMatchPercentage(jobDescription, cvSections);

      // Step 4: Similarity Calculation (happens inside calculateWeightedMatchPercentage)
      setCurrentAnalysisStep(4);
      // No explicit action here, just updating the step

      // Step 5: Keyword Matching & Gap Analysis
      setCurrentAnalysisStep(5);
      const allCvSkills: string[] = [];
      resume.skills?.forEach(s => {
        allCvSkills.push(s.name);
        s.keywords?.forEach(k => allCvSkills.push(k));
      });
      resume.work?.forEach(w => w.highlights?.forEach(h => allCvSkills.push(h)));

      // Step 6: Weighted Scoring
      setCurrentAnalysisStep(6);
      const reasoning = generateReasoning(totalPercentage, breakdown, jobRequirements, allCvSkills);

      setMatchResult({ percentage: totalPercentage, reasoning, breakdown });
    } catch (error: any) {
      console.error("Error in job matching:", error);
      showError("Sorry, an error occurred while analyzing the job description. Please try again later.");
    } finally {
      setIsMatching(false);
      setCurrentAnalysisStep(0); // Reset progress after completion or error
    }
  };

  const handleContactClick = () => {
    onOpenChange(false);
    navigate("/contact");
  };

  const handleMatchAnother = () => {
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
          {isMatching ? (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <AnalysisProgressBar
                currentStep={currentAnalysisStep}
                totalSteps={ANALYSIS_STEPS.length}
                stepLabels={ANALYSIS_STEPS}
              />
            </div>
          ) : matchResult ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{matchResult.percentage.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground mt-1">Match Percentage</p>
              </div>
              <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap prose dark:prose-invert max-w-none max-h-[200px] overflow-y-auto">
                <ReactMarkdown>{matchResult.reasoning}</ReactMarkdown>
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