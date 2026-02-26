"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, AlertTriangle, Download, Link as LinkIcon, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useJobMatching, analysisSteps } from "@/hooks/useJobMatching";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { showError } from "@/utils/toast";
import { Progress } from "@/components/ui/progress";
import { downloadTextFile } from "@/utils/fileDownload";
import { cn, parseReasoningSections, markdownToPlainText, cleanJobDescriptionText } from "@/lib/utils";
import { analyzeAndTranslateJobDescription } from "@/utils/aiTextAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { generateCareerFitPdf } from "@/utils/pdfGenerator";
import { User } from "@supabase/supabase-js";

const MIN_JOB_DESCRIPTION_LENGTH = 250;


export const CareerFitAnalyst = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [isPreProcessing, setIsPreProcessing] = useState(false);
  const [_originalLanguage, setOriginalLanguage] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<"text" | "url">("text");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [_user, setUser] = useState<User | null>(null);
  const [displayOverallStepIndex, setDisplayOverallStepIndex] = useState(-1); // New state for visual progress
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
  } = useJobMatching();

  const parsedSections = useMemo(() => {
    if (!matchResult?.reasoning) return { matchingLines: [], gapLines: [] };
    return parseReasoningSections(matchResult.reasoning, { matchingMax: 3, gapsMax: 2 });
  }, [matchResult?.reasoning]);

  const effectivePercentage = useMemo(() => {
    if (!matchResult) return 0;
    return matchResult.percentage;
  }, [matchResult]);

  const overallSteps = useMemo(() => [
    "Validating entered text",
    ...analysisSteps
  ], []);
  const totalOverallSteps = overallSteps.length;

  const currentOverallStepIndex = useMemo(() => {
    if (isPreProcessing) return 0;
    if (isMatching) return currentStepIndex + 1;
    return -1; // No active process
  }, [isPreProcessing, isMatching, currentStepIndex]);

  const progressValue = useMemo(() => {
    if (totalOverallSteps === 0 || displayOverallStepIndex === -1) return 0;
    return ((displayOverallStepIndex + 1) / totalOverallSteps) * 100;
  }, [totalOverallSteps, displayOverallStepIndex]);

  useEffect(() => {
    // Reset originalLanguage when no process is active
    if (!(isPreProcessing || isMatching)) {
      setOriginalLanguage(null);
    }
  }, [isPreProcessing, isMatching]);

  // Effect to advance the display index every 4 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (contextLoading || isMatching || isPreProcessing || isFetchingUrl) {
      interval = setInterval(() => {
        setDisplayOverallStepIndex((prevDisplayIndex) => {
          // Advance the display index, but don't go beyond the total number of steps
          return Math.min(prevDisplayIndex + 1, totalOverallSteps - 1);
        });
      }, 4000);
    } else {
      // Reset when no process is active
      setDisplayOverallStepIndex(-1);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [contextLoading, isMatching, isPreProcessing, isFetchingUrl, totalOverallSteps]);

  // Effect to ensure display index never lags behind the actual progress
  useEffect(() => {
    if (currentOverallStepIndex > displayOverallStepIndex) {
      setDisplayOverallStepIndex(currentOverallStepIndex);
    }
  }, [currentOverallStepIndex, displayOverallStepIndex]);

  // Initialize displayOverallStepIndex when a process starts
  useEffect(() => {
    if ((contextLoading || isMatching || isPreProcessing || isFetchingUrl) && displayOverallStepIndex === -1) {
      setDisplayOverallStepIndex(0);
    }
  }, [contextLoading, isMatching, isPreProcessing, isFetchingUrl, displayOverallStepIndex]);


  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setIsButtonEnabled(value.length >= MIN_JOB_DESCRIPTION_LENGTH);
  }, []);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setJobDescriptionUrl(value);
    setIsButtonEnabled(value.trim() !== "");
  }, []);

  const fetchJobDescriptionFromUrl = useCallback(async (url: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-url-content', {
        body: { url },
      });

      if (error) {
        throw new Error(error.message);
      }
      if (!data || !data.content) {
        throw new Error("Failed to retrieve content from the URL.");
      }
      return data.content;
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Error fetching job description from URL via proxy: ${err.message}`);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!resume) {
      showError("Resume data is not available for matching. Please ensure VITE_RESUME_URL is set and accessible.");
      return;
    }
    if (contextError || geminiClientError) {
      showError(contextError || geminiClientError || "An error occurred with the AI service or context loading.");
      return;
    }

    if (inputMethod === "text") {
      if (jobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
        showError(`Please enter at least ${MIN_JOB_DESCRIPTION_LENGTH} characters for a meaningful match.`);
        return;
      }
    } else { // inputMethod === "url"
      if (!jobDescriptionUrl.trim()) {
        showError("Please enter a valid URL.");
        return;
      }
      setIsFetchingUrl(true);
    }

    setIsPreProcessing(true);

    try {
      let textToAnalyze = jobDescription;

      if (inputMethod === "url") {
        const fetchedHtml = await fetchJobDescriptionFromUrl(jobDescriptionUrl);
        textToAnalyze = cleanJobDescriptionText(fetchedHtml);
        setJobDescription(textToAnalyze); // Update textarea with cleaned content
      }

      const analysisResult = await analyzeAndTranslateJobDescription(textToAnalyze);
      setOriginalLanguage(analysisResult.originalLanguage);

      if (!analysisResult.isValidJobDescription) {
        throw new Error(analysisResult.processedText); // Throw error to be caught below
      }

      await performJobMatch(analysisResult.processedText);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error in pre-analysis or career fit analysis:", err);
      showError(err.message || "Sorry, an error occurred during job description validation or analysis. Please check your input and try again.");
    } finally {
      setIsPreProcessing(false);
      setIsFetchingUrl(false);
    }
  }, [
    inputMethod,
    jobDescription,
    jobDescriptionUrl,
    resume,
    contextError,
    geminiClientError,
    fetchJobDescriptionFromUrl,
    performJobMatch,
  ]);

  const handleAnalyzeAnother = useCallback(() => {
    resetMatch();
    setJobDescription("");
    setJobDescriptionUrl("");
    setIsButtonEnabled(false);
    setIsPreProcessing(false);
    setOriginalLanguage(null);
    setDisplayOverallStepIndex(-1); // Reset display index
  }, [resetMatch]);

  const handleDownloadText = useCallback(() => {
    if (matchResult?.reasoning) {
      // Clean the reasoning to ensure proper formatting
      const cleanedReasoning = matchResult.reasoning
        .replace(/\\n\+/g, '\n+')  // Replace escaped \n+ with actual newline + bullet
        .replace(/\\n/g, '\n')      // Replace any remaining escaped newlines
        .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines

      const plainTextContent = markdownToPlainText(cleanedReasoning);
      downloadTextFile(plainTextContent, "CareerFitAnalysis.txt");
    } else {
      showError("No analysis result to download.");
    }
  }, [matchResult?.reasoning]);

  const handleDownloadPdf = useCallback(async () => {
    if (!matchResult) {
      showError("No analysis result to download as PDF.");
      return;
    }

    setIsGeneratingPdf(true);

    try {
      // Parse reasoning into matching + gaps sections
      const cleanedReasoning = matchResult.reasoning
        .replace(/\\n\+/g, '\n+')
        .replace(/\\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n');

      // Parse highlights (from new AI field or fall back to empty)
      const cleanedHighlights = (matchResult.highlights ?? '')
        .replace(/\\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n');

      // Split reasoning into Matching and Gaps sections
      const lines = cleanedReasoning.split('\n');
      const matchingItems: string[] = [];
      const gapItems: string[] = [];
      let inMatching = false, inGaps = false;
      for (const line of lines) {
        if (line.startsWith('## Matching Areas')) { inMatching = true; inGaps = false; continue; }
        if (line.startsWith('## Gaps')) { inMatching = false; inGaps = true; continue; }
        const trimmed = line.replace(/^\s*[+-]\s*/, '').trim();
        if (trimmed.length === 0) continue;
        if (inMatching) matchingItems.push(trimmed);
        else if (inGaps) gapItems.push(trimmed);
      }

      // Parse bullet highlights
      const highlightLines = cleanedHighlights
        .split('\n')
        .filter(l => l.trim().startsWith('-'))
        .map(l => l.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean);

      const renderBold = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      const highlightsHtml = highlightLines.length > 0
        ? `<ul class="highlight-list">${highlightLines.map(l => `<li>${renderBold(l)}</li>`).join('')}</ul>`
        : `<p class="meta">Full job description pasted — see original text below.</p>
           <pre class="jd-text">${jobDescription.slice(0, 1200)}${jobDescription.length > 1200 ? '\n...' : ''}</pre>`;


      const scoreColour = effectivePercentage >= 70 ? '#10b981' : effectivePercentage >= 45 ? '#f59e0b' : '#ef4444';

      const contentToPrint = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Career Fit Analysis</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 2cm 2.2cm; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
      color: #1a1a2e;
      line-height: 1.65;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Section wrapper: each starts a new page ── */
    .pdf-section { page-break-before: always; }
    .pdf-section:first-child { page-break-before: avoid; }

    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 12pt;
      margin-bottom: 20pt;
    }
    .report-header h1 { font-size: 16pt; font-weight: 700; color: #111827; }
    .report-header .meta { font-size: 9pt; color: #6b7280; }

    .score-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f9fafb;
      border: 1.5px solid #e5e7eb;
      border-radius: 999px;
      padding: 4pt 12pt;
      font-size: 13pt;
      font-weight: 700;
      color: ${scoreColour};
    }

    /* ── Section headings ── */
    .section-title {
      font-size: 13pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12pt;
      padding-bottom: 4pt;
      border-bottom: 1.5px solid #e5e7eb;
    }
    .section-subtitle {
      font-size: 9pt;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8pt;
    }
    .match-subtitle { color: #059669; }
    .gap-subtitle { color: #d97706; }

    /* ── Highlight list (Section 1) ── */
    .highlight-list {
      list-style: none;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6pt 16pt;
      margin-top: 8pt;
    }
    .highlight-list li {
      font-size: 10pt;
      padding: 6pt 10pt;
      background: #f3f4f6;
      border-left: 3px solid #6366f1;
      border-radius: 3pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .jd-text {
      font-family: inherit;
      font-size: 9.5pt;
      white-space: pre-wrap;
      color: #374151;
      line-height: 1.6;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 10pt;
      border-radius: 4pt;
    }

    /* ── Result items (Sections 2 & 3) ── */
    .result-list { list-style: none; }
    .result-item {
      display: flex;
      gap: 10pt;
      padding: 8pt 10pt;
      margin-bottom: 6pt;
      border-radius: 4pt;
      font-size: 10.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .result-item.match { background: #f0fdf4; border-left: 3px solid #10b981; }
    .result-item.gap   { background: #fffbeb; border-left: 3px solid #f59e0b; }

    .icon { font-size: 11pt; flex-shrink: 0; margin-top: 1pt; }
    .match-icon { color: #10b981; }
    .gap-icon { color: #f59e0b; }

    /* ── Source URL ── */
    .source-url { font-size: 9pt; color: #6b7280; margin-bottom: 12pt; }
    .source-url a { color: #4f46e5; }

    @media print {
      body { font-size: 11pt; }
    }
  </style>
</head>
<body>

  <!-- ═══ SECTION 1: Job Highlights ═══ -->
  <div class="pdf-section">
    <div class="report-header">
      <div>
        <h1>Career Fit Analysis</h1>
        <p class="meta">Rajesh Narayanan · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="score-badge">${effectivePercentage}% Match</div>
    </div>

    <h2 class="section-title">Job Highlights</h2>
    ${inputMethod === 'url' ? `<p class="source-url">Source: <a href="${jobDescriptionUrl}">${jobDescriptionUrl}</a></p>` : ''}
    ${highlightsHtml}
  </div>

  <!-- ═══ SECTION 2: Matching Areas ═══ -->
  <div class="pdf-section">
    <h2 class="section-title">Matching Areas</h2>
    <p class="section-subtitle match-subtitle">Where my profile aligns with the role</p>
    <ul class="result-list">
      ${matchingItems.map(l => `<li class="result-item match"><span class="icon match-icon">✓</span><span>${renderBold(l)}</span></li>`).join('')}
    </ul>
  </div>

  <!-- ═══ SECTION 3: Areas to Bridge ═══ -->
  <div class="pdf-section">
    <h2 class="section-title">Areas to Bridge</h2>
    <p class="section-subtitle gap-subtitle">Identified gaps and how I can address them</p>
    <ul class="result-list">
      ${gapItems.map(l => `<li class="result-item gap"><span class="icon gap-icon">→</span><span>${renderBold(l)}</span></li>`).join('')}
    </ul>
  </div>

</body>
</html>`;

      await generateCareerFitPdf(contentToPrint, "CareerFitAnalysis.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showError("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [matchResult, inputMethod, jobDescriptionUrl, jobDescription, effectivePercentage]);


  const displayError = contextError || geminiClientError;

  const isGeneratingMatchResults = useMemo(() => {
    return overallSteps[displayOverallStepIndex] === "Generating Match Results";
  }, [overallSteps, displayOverallStepIndex]);

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

        {contextLoading || isMatching || isPreProcessing || isFetchingUrl ? (
          <div className="space-y-4 text-center py-8">
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {overallSteps.map((step, index) => (
                <React.Fragment key={index}>
                  <span
                    className={cn(
                      "text-sm transition-colors duration-300",
                      index === displayOverallStepIndex // Use displayOverallStepIndex for animation
                        ? "text-primary font-bold animate-pulse"
                        : "text-muted-foreground"
                    )}
                  >
                    {step}
                  </span>
                  {index < totalOverallSteps - 1 && (
                    <span className="text-muted-foreground mx-1">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <Progress value={progressValue} className="w-full" />
            {isGeneratingMatchResults && (
              <p className="text-sm text-muted-foreground">
                This step may take a few minutes depending on the length of your job description and the number of matching criteria.
              </p>
            )}
          </div>
        ) : (
          <>
            <Tabs defaultValue="text" onValueChange={(value) => setInputMethod(value as "text" | "url")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Paste Description</TabsTrigger>
                <TabsTrigger value="url" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Provide URL</TabsTrigger>
              </TabsList>
              <TabsContent value="text">
                <Textarea
                  placeholder={`Paste your job description here (minimum ${MIN_JOB_DESCRIPTION_LENGTH} characters)...`}
                  value={jobDescription}
                  onChange={handleInputChange}
                  className="min-h-[200px]"
                  disabled={!resume || !!displayError}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {jobDescription.length}/{MIN_JOB_DESCRIPTION_LENGTH} characters minimum
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Matching job descriptions longer than 2000 characters in length or using an URL to match can take a several minutes to complete.
                </p>
              </TabsContent>
              <TabsContent value="url">
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/job-description"
                    value={jobDescriptionUrl}
                    onChange={handleUrlChange}
                    disabled={!resume || !!displayError}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!isButtonEnabled || !resume || !!displayError}
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Fetch & Analyze
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Provide a URL where the job description is hosted.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Matching job descriptions longer than 2000 characters in length or using an URL to match can take a several minutes to complete.
                </p>
              </TabsContent>
            </Tabs>

            {!matchResult && inputMethod === "text" && (
              <Button
                onClick={handleSubmit}
                disabled={!isButtonEnabled || !resume || !!displayError}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Match my Portfolio with your Job Description
              </Button>
            )}

            {matchResult && (
              <Button onClick={handleAnalyzeAnother} className="w-full pdf-hidden">
                Analyze Another Job Description
              </Button>
            )}
          </>
        )}

        {matchResult && !isMatching && !contextLoading && !isPreProcessing && (
          <div className="space-y-4 mt-6">
            {/* Match Score Row — visible to all visitors */}
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const roundedPercentage = Math.round(effectivePercentage / 10) * 10;
                    const isLit = (i + 1) * 10 <= roundedPercentage;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "h-2.5 w-2.5 rounded-full transition-colors",
                          isLit ? "bg-primary" : "bg-muted-foreground/25"
                        )}
                      />
                    );
                  })}
                </div>
                <span className={cn(
                  "text-lg font-bold tabular-nums",
                  effectivePercentage >= 70 ? "text-emerald-500 dark:text-emerald-400"
                    : effectivePercentage >= 45 ? "text-amber-500 dark:text-amber-400"
                      : "text-rose-500 dark:text-rose-400"
                )}>
                  {effectivePercentage}% Match
                </span>
              </div>
              <p className="text-xs text-muted-foreground tracking-wide uppercase">Compatibility Score</p>
            </div>

            {/* Matching Areas Card */}
            {parsedSections.matchingLines.length > 0 && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Matching Areas</p>
                </div>
                <ul className="space-y-2">
                  {parsedSections.matchingLines.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground leading-snug">
                      <span className="mt-0.5 text-emerald-500 shrink-0">✓</span>
                      <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps Card */}
            {parsedSections.gapLines.length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Areas to Bridge</p>
                </div>
                <ul className="space-y-2">
                  {parsedSections.gapLines.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground leading-snug">
                      <span className="mt-0.5 text-amber-500 shrink-0">→</span>
                      <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Download actions */}
            <div className="flex justify-center gap-2 pdf-hidden">
              <Button
                onClick={handleDownloadText}
                variant="outline"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" /> Download as Text
              </Button>
              <Button
                onClick={handleDownloadPdf}
                variant="outline"
                size="sm"
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating PDF...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" /> Download as PDF
                  </>
                )}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Full matching areas and gaps are included in the Text and PDF downloads.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};