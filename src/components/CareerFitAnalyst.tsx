"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJobMatching } from "@/hooks/useJobMatching";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { showError } from "@/utils/toast";
import { Progress } from "@/components/ui/progress"; // Import Progress component

export const CareerFitAnalyst = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  const {
    isMatching,
    matchResult,
    performJobMatch,
    resetMatch,
    contextLoading,
    contextError,
    geminiClientError,
    resume,
    currentStepIndex,
    currentStepTitle,
    totalSteps,
  } = useJobMatching();

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

    if (!resume) {
      showError("Resume data is not available for matching. Please ensure VITE_RESUME_URL is set and accessible.");
      return;
    }
    if (contextError || geminiClientError) {
      showError(contextError || geminiClientError || "An error occurred with the AI service or context loading.");
      return;
    }

    try {
      await performJobMatch(jobDescription);
    } catch (error: any) {
      console.error("Error in career fit analysis:", error);
      showError("Sorry, an error occurred while analyzing the job description. Please try again later.");
    }
  };

  const handleAnalyzeAnother = () => {
    resetMatch();
    setJobDescription("");
    setIsButtonEnabled(false);
  };

  const displayError = contextError || geminiClientError;
  const progressValue = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI-Powered Career Fit Analyst
        </CardTitle>
        <CardDescription>
          Quantify the alignment between your job description and Rajesh Narayanan's qualifications, skills, and extensive experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {displayError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              {displayError} Please ensure <code>VITE_GEMINI_API_KEY</code>, <code>VITE_GEMINI_MODEL_NAME</code>, and <code>VITE_RESUME_URL</code> are correctly set in your environment variables.
            </AlertDescription>
          </Alert>
        )}

        {contextLoading || isMatching ? (
          <div className="space-y-4 text-center py-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {contextLoading ? "Loading portfolio data..." : `Analyzing: ${currentStepTitle}`}
            </p>
            <Progress value={progressValue} className="w-full" />
          </div>
        ) : matchResult ? (
          <div className="space-y-4">
            <ScrollArea className="h-64 bg-muted p-4 rounded-lg prose dark:prose-invert max-w-none">
              <ReactMarkdown>{matchResult.reasoning}</ReactMarkdown>
            </ScrollArea>
            <Button onClick={handleAnalyzeAnother} className="w-full">
              Analyze Another Job Description
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              placeholder="Paste your job description here (minimum 80 characters)..."
              value={jobDescription}
              onChange={handleInputChange}
              className="min-h-[200px]"
              disabled={isMatching || contextLoading || !resume || !!displayError}
            />
            <p className="text-sm text-muted-foreground">
              {jobDescription.length}/80 characters minimum
            </p>
            <Button
              onClick={handleSubmit}
              disabled={!isButtonEnabled || isMatching || contextLoading || !resume || !!displayError}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Calculate Match Percentage
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};