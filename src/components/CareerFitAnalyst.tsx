"use client";

import React, { useState, useRef, useEffect } from "react";
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
  "orm": "Oromo", "swa": "Swahili", "am": "Amharic", "ne": "Nepali", "ur": "Urdu",
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
  "eng": "English", "fra": "French", "spa": "Spanish", "deu": "German",
  "ita": "Italian", "por": "Portuguese", "nld": "Dutch", "swe": "Swedish", "nor": "Norwegian", "dan": "Danish",
  "ice": "Icelandic", "gle": "Irish", "cym": "Welsh", "mlt": "Maltese", "fao": "Faroese", "gsw": "Swiss German",
  "fry": "Western Frisian", "sco": "Scots", "gla": "Scottish Gaelic", "cor": "Cornish", "bre": "Breton",
  "oci": "Occitan", "srd": "Sardinian", "wln": "Walloon", "vol": "Volapük", "zha": "Zhuang", "yid": "Yiddish",
  "uig": "Uyghur", "tuk": "Turkmen", "tat": "Tatar", "bak": "Bashkir", "chv": "Chuvash", "oss": "Ossetian",
  "abk": "Abkhazian", "che": "Chechen", "ava": "Avaric", "lez": "Lezghian", "inh": "Ingush", "kbd": "Kabardian",
  "ady": "Adyghe", "xal": "Kalmyk", "sah": "Sakha", "tyv": "Tuvan", "alt": "Southern Altai", "krc": "Karachay-Balkar",
  "nog": "Nogai", "gag": "Gagauz", "crh": "Crimean Tatar", "udm": "Udmurt", "mdf": "Moksha", "myv": "Erzya",
  "mhr": "Eastern Mari", "kpv": "Komi-Zyrian", "koi": "Komi-Permyak", "vep": "Veps",
  "olo": "Olonets Karelian", "krl": "Karelian", "sjd": "Kildin Sami", "sje": "Pite Sami", "sjt": "Ter Sami",
  "sjk": "Skolt Sami", "smn": "Inari Sami", "sms": "Skolt Sami", "smj": "Lule Sami", "sma": "Southern Sami",
  "sme": "Northern Sami", "jpn": "Japanese", "kor": "Korean", "vie": "Vietnamese", "tha": "Thai", "khm": "Khmer",
  "lao": "Lao", "mya": "Burmese", "mon": "Mongolian", "uzb": "Uzbek", "kaz": "Kazakh", "kir": "Kyrgyz",
  "tgk": "Tajik", "bo": "Tibetan", "cmn": "Mandarin Chinese", "yue": "Cantonese",
  "nan": "Min Nan", "hak": "Hakka", "wuu": "Wu Chinese", "gan": "Gan Chinese", "hsn": "Xiang Chinese",
  "och": "Old Chinese", "lzh": "Literary Chinese"
};

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

  // State for visual glowing progress
  const [displayStepIndex, setDisplayStepIndex] = useState(0);
  const glowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to update limitedReasoning whenever matchResult changes
  useEffect(() => {
    if (matchResult?.reasoning) {
      setLimitedReasoning(limitGapsInMarkdown(matchResult.reasoning));
    } else {
      setLimitedReasoning('');
    }
  }, [matchResult]);

  // Combine pre-processing and matching steps for overall progress
  const overallSteps = [
    "Validating & Translating Job Description", // This is the pre-processing step
    ...analysisSteps // These are the steps from useJobMatching
  ];
  const totalOverallSteps = overallSteps.length;

  const currentOverallStepIndex = isPreProcessing ? 0 : (isMatching ? (currentStepIndex + 1) : -1);
  const currentOverallStepTitle = isPreProcessing ? preProcessingMessage : (isMatching ? currentStepTitle : "");
  const progressValue = totalOverallSteps > 0 && (isPreProcessing || isMatching) ? ((currentOverallStepIndex + 1) / totalOverallSteps) * 100 : 0;

  // Effect for controlling the visual glowing of steps
  useEffect(() => {
    // Clear any existing timer when dependencies change
    if (glowTimerRef.current) {
      clearTimeout(glowTimerRef.current);
      glowTimerRef.current = null;
    }

    // If actual progress has advanced, immediately update displayStepIndex
    if (currentOverallStepIndex > displayStepIndex) {
      setDisplayStepIndex(currentOverallStepIndex);
    }

    // If currently processing and not on the last step, set a timer to advance displayStepIndex
    // The last step can glow longer, so no auto-advance for it.
    if ((isPreProcessing || isMatching) && displayStepIndex < totalOverallSteps - 1) {
      glowTimerRef.current = setTimeout(() => {
        // Only advance if the actual step hasn't caught up or surpassed
        if (displayStepIndex === currentOverallStepIndex) {
          setDisplayStepIndex(prev => Math.min(prev + 1, totalOverallSteps - 1));
        }
      }, 3000); // Glow for 3 seconds
    } else if (!(isPreProcessing || isMatching)) {
      // If not processing, reset displayStepIndex
      setDisplayStepIndex(0);
    }

    return () => {
      if (glowTimerRef.current) {
        clearTimeout(glowTimerRef.current);
      }
    };
  }, [currentOverallStepIndex, displayStepIndex, isPreProcessing, isMatching, totalOverallSteps]);

  // Reset displayStepIndex when analysis starts or resets
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
    setDisplayStepIndex(0); // Ensure visual progress starts at 0

    try {
      const analysisResult = await analyzeAndTranslateJobDescription(jobDescription);

      if (!analysisResult.isValidJobDescription) {
        showError(analysisResult.processedText); // This will contain the "INVALID_JOB_DESCRIPTION" message
        return;
      }

      if (analysisResult.originalLanguage !== 'en') {
        const fullLanguageName = languageNames[analysisResult.originalLanguage] || analysisResult.originalLanguage.toUpperCase();
        setPreProcessingMessage(`Translating job description from ${fullLanguageName} to English...`);
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
    setDisplayStepIndex(0); // Reset visual progress
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