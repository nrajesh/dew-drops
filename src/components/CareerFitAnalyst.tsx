"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, AlertTriangle, Download, Link as LinkIcon, FileText } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJobMatching, analysisSteps } from "@/hooks/useJobMatching";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { showError } from "@/utils/toast";
import { Progress } from "@/components/ui/progress";
import { downloadTextFile } from "@/utils/fileDownload";
import { cn, limitGapsInMarkdown, markdownToPlainText, cleanJobDescriptionText } from "@/lib/utils";
import { analyzeAndTranslateJobDescription } from "@/utils/aiTextAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { generateCareerFitPdf } from "@/utils/pdfGenerator"; // Import the new PDF utility
import { marked } from 'marked'; // Import marked for markdown to HTML conversion

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

  const overallSteps = useMemo(() => [
    "Validating entered text",
    ...analysisSteps
  ], []);
  const totalOverallSteps = overallSteps.length;

  const currentOverallStepIndex = useMemo(() => {
    if (isPreProcessing) return 0;
    if (isMatching) return currentStepIndex + 1;
    return -1;
  }, [isPreProcessing, isMatching, currentStepIndex]);

  const progressValue = useMemo(() => {
    if (totalOverallSteps === 0 || (!isPreProcessing && !isMatching)) return 0;
    return ((displayStepIndex + 1) / totalOverallSteps) * 100;
  }, [totalOverallSteps, isPreProcessing, isMatching, displayStepIndex]);

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
    } catch (error: any) {
      throw new Error(`Error fetching job description from URL via proxy: ${error.message}`);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
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
      setIsFetchingUrl(true);
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
    setDisplayStepIndex(0);

    try {
      let textToAnalyze = jobDescription;

      if (inputMethod === "url") {
        const fetchedHtml = await fetchJobDescriptionFromUrl(jobDescriptionUrl);
        textToAnalyze = cleanJobDescriptionText(fetchedHtml); // Use the new cleaning function
        setJobDescription(textToAnalyze); // Set the fetched and cleaned content to jobDescription state
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
    setLimitedReasoning('');
    setIsPreProcessing(false);
    setDisplayStepIndex(0);
    setOriginalLanguage(null);
  }, [resetMatch]);

  const handleDownloadText = useCallback(() => {
    if (limitedReasoning) {
      const plainTextContent = markdownToPlainText(limitedReasoning);
      downloadTextFile(plainTextContent, "CareerFitAnalysis.txt");
    } else {
      showError("No analysis result to download.");
    }
  }, [limitedReasoning]);

  const handleDownloadPdf = useCallback(async () => {
    if (!matchResult) {
      showError("No analysis result to download as PDF.");
      return;
    }

    // Convert markdown reasoning to HTML
    const renderedMarkdownHtml = marked.parse(limitedReasoning);

    const contentToPrint = `
      <div class="pdf-content-wrapper">
        <h2 class="text-2xl font-bold mb-4">Job Description</h2>
        ${inputMethod === "url" ? `<p class="text-muted-foreground mb-4">Source URL: <a href="${jobDescriptionUrl}" target="_blank" rel="noopener noreferrer">${jobDescriptionUrl}</a></p>` : ''}
        <p class="whitespace-pre-wrap text-sm mb-8">${jobDescription}</p>

        <h2 class="text-2xl font-bold mb-4">Career Fit Analyst Result</h2>
        <div class="prose dark:prose-invert max-w-none career-fit-output">
          ${renderedMarkdownHtml}
        </div>
      </div>
    `;

    await generateCareerFitPdf(contentToPrint, "CareerFitAnalysis.pdf");
  }, [matchResult, limitedReasoning, inputMethod, jobDescriptionUrl, jobDescription]);

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
            <div className="flex justify-end gap-2 mb-4 pdf-hidden">
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
              >
                <FileText className="mr-2 h-4 w-4" /> Download as PDF
              </Button>
            </div>
            <ScrollArea className="h-64 bg-muted p-4 rounded-lg prose dark:prose-invert max-w-none career-fit-output">
              <ReactMarkdown>{limitedReasoning}</ReactMarkdown>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};