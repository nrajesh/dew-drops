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
  onMatchRequest: (jobDescription: string) => void; // This will now trigger the Chatbot
}

export const JobMatchPopup = ({ isOpen, onOpenChange, onMatchRequest }: JobMatchPopupProps) => {
  const [jobDescription, setJobDescription] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [isMatching, setIsMatching] = useState(false); // Keep for loading state
  const navigate = useNavigate();
  const { context, loading: contextLoading, error: contextError } = usePortfolioContext();

  useEffect(() => {
    if (!isOpen) {
      // Reset state when popup is closed
      setJobDescription("");
      setIsButtonEnabled(false);
      setIsMatching(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setIsButtonEnabled(value.length >= 80);
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

    setIsMatching(true); // Indicate loading while opening chat
    onMatchRequest(jobDescription); // Trigger the chat with the job description
    onOpenChange(false); // Close this popup
    setIsMatching(false); // Reset loading state
  };

  const handleContactClick = () => {
    onOpenChange(false);
    navigate("/contact");
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
        </div>
        <DialogFooter className="flex flex-col gap-2">
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
          <Button
            variant="outline"
            onClick={handleContactClick}
            className="w-full"
          >
            Contact Me
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};