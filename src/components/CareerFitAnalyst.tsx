"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, AlertTriangle, Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJobMatching, analysisSteps } from "@/hooks/useJobMatching";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { showError } from "@/utils/toast";
import { Progress } from "@/components/ui/progress";
import { downloadTextFile } from "@/utils/fileDownload";
import { cn, limitGapsInMarkdown, markdownToPlainText } from "@/lib/utils";
import { analyzeAndTranslateJobDescription } from "@/utils/aiTextAnalysis"; // Import the new utility

const MIN_JOB_DESCRIPTION_LENGTH = 250; // Increased minimum character length

export const CareerFitAnalyst = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [isPreProcessing, setIsPreProcessing] = useState(false); // New state for validation/translation
  const [preProcessingMessage, setPreProcessingMessage] = useState(""); // Message for pre-processing step

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

  // State to store the reasoning after applying the gap limit
  const [limitedReasoning, setLimitedReasoning] = useState<string>('');

  // Effect to update limitedReasoning whenever matchResult changes
  useEffect(() => {
    if (matchResult?.reasoning) {
      setLimitedReasoning(limitGapsInMarkdown(matchResult.reasoning));
    } else {
      setLimitedReasoning('');
    }
  }, [matchResult]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setIsButtonEnabled(value.length >= MIN_JOB_DESCRIPTION_LENGTH);
  };

  const handleSubmit = async () => {
    if (jobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
      showError(`Please enter at least ${MIN_JOB_DESCRIPTION_LENGTH} characters for a meaningful match.`);
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

    setIsPreProcessing(true);
    setPreProcessingMessage("Detecting language and validating job description...");

    try {
      const analysisResult = await analyzeAndTranslateJobDescription(jobDescription);

      if (!analysisResult.isValidJobDescription) {
        showError(analysisResult.processedText); // This will contain the "INVALID_JOB_DESCRIPTION" message
        return;
      }

      if (analysisResult.originalLanguage !== 'en') {
        setPreProcessingMessage(`Translating job description from ${analysisResult.originalLanguage.toUpperCase()} to English...`);
      } else {
        setPreProcessingMessage("Job description validated. Proceeding with analysis...");
      }

      // Proceed with job matching using the processed (potentially translated) text
      await performJobMatch(analysisResult.processedText);

    } catch (error: any) {
      console.error("Error in pre-analysis or career fit analysis:", error);
      showError(error.message || "Sorry, an error occurred during job description validation or analysis. Please try again later.");
    } finally {
      setIsPreProcessing(false);
      setPreProcessingMessage("");
    }
  };

  const handleAnalyzeAnother = () => {
    resetMatch();
    setJobDescription("");
    setIsButtonEnabled(false);
    setLimitedReasoning(''); // Clear limited reasoning on reset
    setIsPreProcessing(false);
    setPreProcessingMessage("");
  };

  const handleDownloadText = () => {
    if (limitedReasoning) {
      // Use the pre-limited reasoning for download
      const plainTextContent = markdownToPlainText(limitedReasoning);
      downloadTextFile(plainTextContent, "CareerFitAnalysis.txt");
    } else {
      showError("No analysis result to download.");
    }
  };

  const displayError = contextError || geminiClientError;

  // Combine pre-processing and matching steps for overall progress
  const overallSteps = [
    "Validating & Translating Job Description", // This is the pre-processing step
    ...analysisSteps // These are the steps from useJobMatching
  ];

  const currentOverallStepIndex = isPreProcessing ? 0 : (isMatching ? (currentStepIndex + 1) : -1);
  const currentOverallStepTitle = isPreProcessing ? preProcessingMessage : (isMatching ? currentStepTitle : "");
  const totalOverallSteps = overallSteps.length;
  const progressValue = totalOverallSteps > 0 && (isPreProcessing || isMatching) ? ((currentOverallStepIndex + 1) / totalOverallSteps) * 100 : 0;


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

        {contextLoading || isMatching || isPreProcessing ? (
          <div className="space-y-4 text-center py-8">
            <div className="flex justify-center gap-4 mb-4 flex-wrap">
              {overallSteps.map((step, index) => (
                <span
                  key={index}
                  className={cn(
                    "text-sm transition-colors duration-300",
                    index === currentOverallStepIndex
                      ? "text-primary font-bold animate-pulse"
                      : "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              ))}
            </div>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {contextLoading ? "Loading portfolio data..." : currentOverallStepTitle}
            </p>
            <Progress value={progressValue} className="w-full" />
          </div>
        ) : (
          <>
            <Textarea
              placeholder={`Paste your job description here (minimum ${MIN_JOB_DESCRIPTION_LENGTH} characters)...`}
              value={jobDescription}
              onChange={handleInputChange}
              className="min-h-[200px]"
              disabled={!resume || !!displayError}
            />
            <p className="text-sm text-muted-foreground">
              {jobDescription.length}/{MIN_JOB_DESCRIPTION_LENGTH} characters minimum
            </p>
            {!matchResult ? (
              <Button
                onClick={handleSubmit}
                disabled={!isButtonEnabled || !resume || !!displayError}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Calculate Match Percentage
              </Button>
            ) : (
              <Button onClick={handleAnalyzeAnother} className="w-full">
                Analyze Another Job Description
              </Button>
            )}
          </>
        )}

        {matchResult && !isMatching && !contextLoading && !isPreProcessing && (
          <div className="space-y-4 mt-6">
            <ScrollArea className="h-64 bg-muted p-4 rounded-lg prose dark:prose-invert max-w-none career-fit-output">
              <div className="space-y-4">
                <div className="flex justify-end mb-4 print:hidden">
                  <Button
                    onClick={handleDownloadText}
                    variant="outline"
                    size="sm"
                    className="print:hidden"
                  >
                    <Download className="mr-2 h-4 w-4" /> Download as Text
                  </Button>
                </div>
                <ReactMarkdown>{limitedReasoning}</ReactMarkdown> {/* Use limitedReasoning for display */}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};