"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";

interface JobMatchPopupProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMatchRequest: (jobDescription: string) => void;
}

export const JobMatchPopup = ({ isOpen, onOpenChange, onMatchRequest }: JobMatchPopupProps) => {
  const [jobDescription, setJobDescription] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setIsButtonEnabled(value.length >= 80);
  };

  const handleSubmit = () => {
    if (jobDescription.length < 80) {
      showError("Please enter at least 80 characters for a meaningful match.");
      return;
    }
    onMatchRequest(jobDescription);
    onOpenChange(false);
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
            Enter your job description to see if you're a good fit for the role.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Describe the job you're applying for..."
            value={jobDescription}
            onChange={handleInputChange}
            className="min-h-[150px]"
          />
          <p className="text-sm text-muted-foreground mt-2">
            {jobDescription.length}/80 characters minimum
          </p>
        </div>
        <DialogFooter className="flex flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!isButtonEnabled}
            className="w-full"
          >
            Is Rajesh a Good Match?
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