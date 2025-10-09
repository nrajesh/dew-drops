"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, AlertTriangle, Download, Link as LinkIcon, Mail } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJobMatching, analysisSteps } from "@/hooks/useJobMatching";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { Progress } from "@/components/ui/progress";
import { downloadTextFile } from "@/utils/fileDownload";
import { cn, limitGapsInMarkdown, markdownToPlainText } from "@/lib/utils";
import { analyzeAndTranslateJobDescription } from "@/utils/aiTextAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { generateCvPdfBase64 } from "@/utils/pdfGenerator"; // Import PDF generator

const MIN_JOB_DESCRIPTION_LENGTH = 250;

const languageNames: { [key: string]: string } = {
  "en": "English", "fr": "French", "es": "Spanish", "de": "German", "it": "Italian", "pt": "Portuguese",
  "ru": "Russian", "zh": "Chinese", "ja": "Japanese", "ko": "Korean", "ar": "Arabic", "hi": "Hindi",
  "bn": "Bengali", "nl": "Dutch", "sv": "Swedish", "fi": "Finnish", "pl": "Polish", "tr": "Turkish",
  "el": "Greek", "he": "Hebrew", "th": "Thai", "vi": "Vietnamese", "id": "Indonesian", "ms": "Malay",
  "fa": "Persian", "uk": "Ukrainian", "cs": "Czech", "hu": "Hungarian", "ro": "Romanian", "sk": "Slovak",
  "bg": "Bulgarian", "hr": "Croatian", "sr": "Serbian", "sl": "Slovenian", "et": "Estonian", "lv": "Latvian",
  "lt": "Lithuanian", "is": "Icelandic", "ga": "Irish", "cy": "Welsh", "mt": "Maltese", "sq": "Albanian",
  "mk": "Macedonian", "ka": "Georgian", "hy": "Armenian", "az": "Azerbaijani", "eu": "Basque", "ca": "Catalan",
  "gl": "Galician", "af": "Afrikaans", "sw": "Swahili", "am": "Amharic", "ne": "Nepali", "ur": "Urdu",
  "pa": "Punjabi", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam", "mr": "Marathi", "ta": "Tamil",
  "te": "Telugu", "si": "Sinhala", "km": "Khmer", "lo": "Lao", "my": "Burmese", "mn": "Mongolian",
  "uz": "Uzbek", "kk": "Kazakh", "ky": "Kyrgyz", "tg": "Tajik", "ug": "Uyghur", "tk": "Turkmen", "tt": "Tatar",
  "ba": "Bashkir", "cv": "Chuvash", "os": "Ossetian", "ab": "Abkhazian", "ce": "Chechen", "av": "Avaric",
  "lez": "Lezghian", "inh": "Ingush", "kbd": "Kabardian", "ady": "Adyghe", "xal": "Kalmyk", "sah": "Sakha",
  "tyv": "Tuvan", "alt": "Southern Altai", "krc": "Karachay-Balkar", "nog": "Nogai", "gag": "Gagauz",
  "crh": "Crimean Tatar", "udm": "Udmurt", "mdf": "Moksha", "myv": "Erzya", "mrj": "Western Mari",
  "mhr": "Eastern Mari", "kpv": "Komi-Zyrian", "koi": "Komi-Permyak", "vep": "Veps", "olo": "Olonets Karelian",
  "krl": "Karelian", "sjd": "Kildin Sami", "sje": "Pite Sami", "sjt": "Ter Sami", "sjk": "Skolt Sami",
  "smn": "Inari Sami", "sms": "Skolt Sami", "smj": "Lule Sami", "sma": "Southern Sami", "se": "Northern Sami",
  "fin": "Finnish", "est": "Estonian", "lav": "Latvian", "lit": "Lithuanian", "hun": "Hungarian",
  "ces": "Czech", "slk": "Slovak", "pol": "Polish", "ukr": "Ukrainian", "be": "Belarusian", "rus": "Russian",
  "bul": "Bulgarian", "mkd": "Macedonian", "srp": "Serbian", "hrv": "Croatian", "bs": "Bosnian",
  "slv": "Slovenian", "sqi": "Albanian", "ell": "Greek", "hye": "Armenian", "kat": "Georgian",
  "aze": "Azerbaijani", "tur": "Turkish", "fas": "Persian", "urd": "Urdu", "pus": "Pashto", "snd": "Sindhi",
  "kur": "Kurdish", "ara": "Arabic", "heb": "Hebrew", "amh": "Amharic", "tir": "Tigrinya", "som": "Somali",
  "orm": "Oromo", "swa": "Swahili",
  "hau": "Hausa", "yor": "Yoruba", "ibo": "Igbo", "zul": "Zulu",
  "xho": "Xhosa", "sot": "Southern Sotho", "tso": "Tsonga", "tsn": "Tswana", "ssw": "Swati", "kin": "Kinyarwanda",
  "mlg": "Malagasy", "hat": "Haitian Creole", "jav": "Javanese", "sun": "Sundanese",
  "ind": "Indonesian", "msa": "Malay", "tgl": "Tagalog", "ceb": "Cebuano", "haw": "Hawaiian", "mi": "Maori", "sm": "Samoan",
  "fj": "Fijian", "to": "Tongan", "ty": "Tahitian", "div": "Dhivehi", "dzo": "Dzongkha", "sag": "Sango",
  "sna": "Shona", "nya": "Chichewa", "lin": "Lingala", "lub": "Luba-Katanga", "kon": "Kongo", "kik": "Kikuyu",
  "lug": "Ganda",
  "nep": "Nepali", "hin": "Hindi", "ben": "Bengali", "pan": "Punjabi", "guj": "Gujarati",
  "jpn": "Japanese", "kor": "Korean", "vie": "Vietnamese", "tha": "Thai", "khm": "Khmer", "lao": "Lao",
  "mya": "Burmese", "mon": "Mongolian", "uzb": "Uzbek", "kaz": "Kazakh", "kir": "Kyrgyz", "tgk": "Tajik",
  "bod": "Tibetan", "cmn": "Mandarin Chinese", "yue": "Cantonese",
  "nan": "Min Nan", "hak": "Hakka", "wuu": "Wu Chinese", "gan": "Gan Chinese", "hsn": "Xiang Chinese",
  "och": "Old Chinese", "lzh": "Literary Chinese"
};

export const CareerFitAnalyst = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [isPreProcessing, setIsPreProcessing] = useState(false);
  const [originalLanguage, setOriginalLanguage] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<"text" | "url">("text");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const [isPreAnalysisEmailDialogOpen, setIsPreAnalysisEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [attachCv, setAttachCv] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [pendingEmailDetails, setPendingEmailDetails] = useState<{ recipientEmail: string; attachCv: boolean; } | null>(null);


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

  const [limitedReasoning, setLimitedReasoning] = useState<string>('');
  const [displayStepIndex, setDisplayStepIndex] = useState(0);
  const glowTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (matchResult?.reasoning) {
      setLimitedReasoning(limitGapsInMarkdown(matchResult.reasoning));
    } else {
      setLimitedReasoning('');
    }
  }, [matchResult]);

  const overallSteps = [
    "Validating entered text",
    ...analysisSteps
  ];
  const totalOverallSteps = overallSteps.length;

  const currentOverallStepIndex = isPreProcessing ? 0 : (isMatching ? (currentStepIndex + 1) : -1);
  const progressValue = totalOverallSteps > 0 && (isPreProcessing || isMatching) ? ((displayStepIndex + 1) / totalOverallSteps) * 100 : 0;

  useEffect(() => {
    if (glowTimerRef.current) {
      clearTimeout(glowTimerRef.current);
      glowTimerRef.current = null;
    }

    if (currentOverallStepIndex > displayStepIndex) {
      setDisplayStepIndex(currentOverallStepIndex);
    }

    const glowDuration = originalLanguage && originalLanguage !== 'en' ? 5000 : 3000;

    if ((isPreProcessing || isMatching) && displayStepIndex < totalOverallSteps - 1) {
      glowTimerRef.current = setTimeout(() => {
        setDisplayStepIndex(prev => Math.min(prev + 1, totalOverallSteps - 1));
      }, glowDuration);
    } else if (!(isPreProcessing || isMatching)) {
      setDisplayStepIndex(0);
      setOriginalLanguage(null);
    }

    return () => {
      if (glowTimerRef.current) {
        clearTimeout(glowTimerRef.current);
      }
    };
  }, [currentOverallStepIndex, displayStepIndex, isPreProcessing, isMatching, totalOverallSteps, originalLanguage]);

  useEffect(() => {
    if (!isPreProcessing && !isMatching && !matchResult) {
      setDisplayStepIndex(0);
    }
  }, [isPreProcessing, isMatching, matchResult]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setIsButtonEnabled(value.length >= MIN_JOB_DESCRIPTION_LENGTH);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJobDescriptionUrl(e.target.value);
    setIsButtonEnabled(e.target.value.trim() !== "");
  };

  const fetchJobDescriptionFromUrl = async (url: string): Promise<string> => {
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
    } catch (error: any) {
      throw new Error(`Error fetching job description from URL via proxy: ${error.message}`);
    }
  };

  const validateAndOpenEmailDialog = async () => {
    if (inputMethod === "text") {
      if (jobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
        showError(`Please enter at least ${MIN_JOB_DESCRIPTION_LENGTH} characters for a meaningful match.`);
        return;
      }
    } else {
      if (!jobDescriptionUrl.trim()) {
        showError("Please enter a valid URL.");
        return;
      }
    }

    if (!resume) {
      showError("Resume data is not available for matching. Please ensure VITE_RESUME_URL is set and accessible.");
      return;
    }
    if (contextError || geminiClientError) {
      showError(contextError || geminiClientError || "An error occurred with the AI service or context loading.");
      return;
    }
    setIsPreAnalysisEmailDialogOpen(true);
  };

  const startAnalysis = async (email: string, attach: boolean) => {
    setIsPreAnalysisEmailDialogOpen(false);
    setPendingEmailDetails({ recipientEmail: email, attachCv: attach });

    setIsPreProcessing(true);
    setDisplayStepIndex(0);

    try {
      let textToAnalyze = jobDescription;

      if (inputMethod === "url") {
        setIsFetchingUrl(true);
        textToAnalyze = await fetchJobDescriptionFromUrl(jobDescriptionUrl);
      }

      const analysisResult = await analyzeAndTranslateJobDescription(textToAnalyze);
      setOriginalLanguage(analysisResult.originalLanguage);

      if (!analysisResult.isValidJobDescription) {
        showError(analysisResult.processedText);
        return;
      }

      await performJobMatch(analysisResult.processedText);
    } catch (error: any) {
      console.error("Error in pre-analysis or career fit analysis:", error);
      showError(error.message || "Sorry, an error occurred during job description validation or analysis. Please try again later.");
      setPendingEmailDetails(null); // Clear pending email details on error
    } finally {
      setIsPreProcessing(false);
      setIsFetchingUrl(false);
    }
  };

  const handleAnalyzeAnother = () => {
    resetMatch();
    setJobDescription("");
    setJobDescriptionUrl("");
    setIsButtonEnabled(false);
    setLimitedReasoning('');
    setIsPreProcessing(false);
    setDisplayStepIndex(0);
    setOriginalLanguage(null);
    setPendingEmailDetails(null); // Clear pending email details
    setRecipientEmail(""); // Reset email input in dialog
    setAttachCv(true); // Reset checkbox in dialog
  };

  const handleDownloadText = () => {
    if (matchResult?.reasoning) { // Use full reasoning for download
      const plainTextContent = markdownToPlainText(matchResult.reasoning);
      downloadTextFile(plainTextContent, "CareerFitAnalysis.txt");
    } else {
      showError("No analysis result to download.");
    }
  };

  const handleEmailSend = async (email: string, attach: boolean, reasoning: string) => {
    if (!email || !reasoning || (attach && !resume)) {
      showError("Please provide a valid email and ensure analysis results and resume are available.");
      return;
    }

    setIsSendingEmail(true);
    const toastId = showLoading("Sending email...");

    try {
      let cvPdfBase64: string | undefined;
      if (attach) {
        cvPdfBase64 = await generateCvPdfBase64(resume!);
      }

      const { error } = await supabase.functions.invoke('send-match-email', {
        body: {
          recipientEmail: email,
          matchReasoning: reasoning,
          attachCv: attach,
          cvPdfBase64,
        },
      });

      if (error) {
        throw error;
      }

      showSuccess("Email sent successfully!");
      setPendingEmailDetails(null); // Clear pending details after successful send
    } catch (error: any) {
      console.error("Error sending email:", error);
      showError(`Failed to send email: ${error.message}`);
    } finally {
      dismissToast(toastId);
      setIsSendingEmail(false);
    }
  };

  useEffect(() => {
    if (matchResult && pendingEmailDetails) {
      handleEmailSend(pendingEmailDetails.recipientEmail, pendingEmailDetails.attachCv, matchResult.reasoning);
    }
  }, [matchResult, pendingEmailDetails, handleEmailSend]);

  const displayError = contextError || geminiClientError;

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
                      index === displayStepIndex
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
            {displayStepIndex === totalOverallSteps - 1 && (
              <p className="text-sm text-muted-foreground">
                This step may take 5-15 seconds depending on the length of your job description and the number of matching criteria.
              </p>
            )}
          </div>
        ) : (
          <>
            <Tabs defaultValue="text" onValueChange={(value) => setInputMethod(value as "text" | "url")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Paste Description</TabsTrigger>
                <TabsTrigger value="url">Provide URL</TabsTrigger>
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
                    onClick={validateAndOpenEmailDialog}
                    disabled={!isButtonEnabled || !resume || !!displayError}
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Fetch & Analyze
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Provide a URL where the job description is hosted.
                </p>
              </TabsContent>
            </Tabs>

            {!matchResult && inputMethod === "text" && (
              <Button
                onClick={validateAndOpenEmailDialog}
                disabled={!isButtonEnabled || !resume || !!displayError}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Calculate Match Percentage
              </Button>
            )}

            {matchResult && (
              <Button onClick={handleAnalyzeAnother} className="w-full">
                Analyze Another Job Description
              </Button>
            )}
          </>
        )}

        {matchResult && !isMatching && !contextLoading && !isPreProcessing && (
          <div className="space-y-4 mt-6">
            <div className="flex justify-end gap-2 mb-4 print:hidden">
              <Button
                onClick={handleDownloadText}
                variant="outline"
                size="sm"
                className="print:hidden"
              >
                <Download className="mr-2 h-4 w-4" /> Download as Text
              </Button>
            </div>
            <ScrollArea className="h-64 bg-muted p-4 rounded-lg prose dark:prose-invert max-w-none career-fit-output">
              <div className="space-y-4">
                <ReactMarkdown>{limitedReasoning}</ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>

      <Dialog open={isPreAnalysisEmailDialogOpen} onOpenChange={setIsPreAnalysisEmailDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Email Analysis Results</DialogTitle>
            <DialogDescription>
              Enter your email address to receive the full career fit analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="col-span-3"
                disabled={isSendingEmail}
              />
            </div>
            <div className="flex items-center space-x-2 col-span-4 col-start-2">
              <Checkbox
                id="attach-cv"
                checked={attachCv}
                onCheckedChange={(checked: boolean) => setAttachCv(checked)}
                disabled={isSendingEmail || !resume}
              />
              <Label htmlFor="attach-cv" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Attach CV as PDF
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreAnalysisEmailDialogOpen(false)} disabled={isSendingEmail}>Cancel</Button>
            <Button onClick={() => startAnalysis(recipientEmail, attachCv)} disabled={isSendingEmail || !recipientEmail || !resume}>
              {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};