import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  showSuccess,
  showError,
  showLoading,
  dismissToast,
} from "@/utils/toast";
import { Loader2, Sparkles } from "lucide-react";
import type {
  JsonResume,
  ResumeWork,
  ResumeEducation,
  ResumeSkill,
  ResumeAward,
  ResumeLanguage,
  ResumeInterest,
  ResumePublication,
  ResumeReference,
} from "@/types/resume";

const formSchema = z.object({
  content: z
    .string()
    .min(10, "Knowledge base content must be at least 10 characters."),
});

const RESUME_URL = import.meta.env.VITE_RESUME_URL;

// Helper function to format resume data
const formatResumeData = (resumeData: JsonResume): string => {
  let resumeContext = "\n\n== CURRICULUM VITAE (PORTFOLIO) ==\n";

  const {
    basics,
    work,
    education,
    skills,
    awards,
    languages,
    interests,
    publications,
    references,
  } = resumeData;

  if (basics) {
    resumeContext += `Name: ${basics.name}\n`;
    resumeContext += `Title: ${basics.label}\n`;
    if (basics.summary) resumeContext += `Summary: ${basics.summary}\n`;
    if (basics.email) resumeContext += `Email: ${basics.email}\n`;
    if (basics.phone) resumeContext += `Phone: ${basics.phone}\n`;
    if (basics.website) resumeContext += `Website: ${basics.website}\n`;
    if (basics.location?.city)
      resumeContext += `Location: ${basics.location.city}, ${basics.location.countryCode}\n`;

    if (basics.profiles && basics.profiles.length > 0) {
      resumeContext += "\nSocial Profiles:\n";
      resumeContext += basics.profiles
        .map((profile) => `- ${profile.network}: ${profile.url}`)
        .join("\n");
      resumeContext += "\n";
    }
  }

  if (work && work.length > 0) {
    resumeContext += "\nWork Experience:\n";
    resumeContext += work
      .map((job: ResumeWork) =>
        `
- ${job.position} at ${job.company} (${job.startDate} - ${job.endDate || "Present"})
  ${job.location ? `Location: ${job.location}` : ""}
  ${job.summary ? `Summary: ${job.summary}` : ""}
  ${job.highlights && job.highlights.length > 0 ? `Highlights: ${job.highlights.join("; ")}` : ""}
`
          .split("\n")
          .filter((line) => line.trim() !== "")
          .join("\n"),
      )
      .join("\n");
    resumeContext += "\n";
  }

  if (education && education.length > 0) {
    resumeContext += "\nEducation:\n";
    resumeContext += education
      .map((edu: ResumeEducation) =>
        `
- ${edu.studyType} in ${edu.area} from ${edu.institution} (${edu.startDate} - ${edu.endDate || "Present"})
  ${edu.gpa ? `GPA: ${edu.gpa}` : ""}
  ${edu.courses && edu.courses.length > 0 ? `Courses: ${edu.courses.join(", ")}` : ""}
`
          .split("\n")
          .filter((line) => line.trim() !== "")
          .join("\n"),
      )
      .join("\n");
    resumeContext += "\n";
  }

  if (skills && skills.length > 0) {
    resumeContext += "\nSkills:\n";
    resumeContext += skills
      .map((skill: ResumeSkill) =>
        `
- ${skill.name} (Level: ${skill.level || "N/A"})
  ${skill.keywords && skill.keywords.length > 0 ? `Keywords: ${skill.keywords.join(", ")}` : ""}
`
          .split("\n")
          .filter((line) => line.trim() !== "")
          .join("\n"),
      )
      .join("\n");
    resumeContext += "\n";
  }

  if (awards && awards.length > 0) {
    resumeContext += "\nAwards:\n";
    resumeContext += awards
      .map((award: ResumeAward) =>
        `
- ${award.title} from ${award.awarder} on ${award.date}
  ${award.summary ? `Summary: ${award.summary}` : ""}
`
          .split("\n")
          .filter((line) => line.trim() !== "")
          .join("\n"),
      )
      .join("\n");
    resumeContext += "\n";
  }

  if (publications && publications.length > 0) {
    resumeContext += "\nPublications:\n";
    resumeContext += publications
      .map((pub: ResumePublication) =>
        `
- ${pub.name} by ${pub.publisher} (${pub.releaseDate})
  ${pub.website ? `Link: ${pub.website}` : ""}
  ${pub.summary ? `Summary: ${pub.summary}` : ""}
`
          .split("\n")
          .filter((line) => line.trim() !== "")
          .join("\n"),
      )
      .join("\n");
    resumeContext += "\n";
  }

  if (languages && languages.length > 0) {
    resumeContext += "\nLanguages:\n";
    resumeContext += languages
      .map(
        (lang: ResumeLanguage) =>
          `- ${lang.language} (Fluency: ${lang.fluency})`,
      )
      .join("\n");
    resumeContext += "\n";
  }

  if (interests && interests.length > 0) {
    resumeContext += "\nInterests:\n";
    resumeContext += interests
      .map((interest: ResumeInterest) =>
        `
- ${interest.name}
  ${interest.keywords && interest.keywords.length > 0 ? `Keywords: ${interest.keywords.join(", ")}` : ""}
`
          .split("\n")
          .filter((line) => line.trim() !== "")
          .join("\n"),
      )
      .join("\n");
    resumeContext += "\n";
  }

  if (references && references.length > 0) {
    resumeContext += "\nReferences:\n";
    resumeContext += references
      .map((ref: ResumeReference) => `- ${ref.name}: ${ref.reference}`)
      .join("\n");
    resumeContext += "\n";
  }
  return resumeContext;
};

const generateContextFromData = async (): Promise<string> => {
  const [postsRes, locationsRes, imagesRes, resumeRes] = await Promise.all([
    supabase
      .from("posts")
      .select("title, description, tags")
      .eq("published", true)
      .limit(20),
    supabase
      .from("travel_locations")
      .select("title, name, description")
      .eq("published", true)
      .limit(20),
    supabase
      .from("gallery_images")
      .select("alt_text, tags")
      .eq("published", true)
      .limit(30),
    RESUME_URL
      ? fetch(RESUME_URL)
          .then((res) => (res.ok ? res.json() : null))
          .catch((e) => {
            console.error("Failed to fetch resume for chatbot context:", e);
            return null;
          })
      : Promise.resolve(null),
  ]);

  let context = `
PORTFOLIO KNOWLEDGE BASE:

== ABOUT THE PORTFOLIO APPLICATION ==
This is a personal portfolio and blog application designed to showcase work, thoughts, and travels.
Key Features:
- Refactored Architecture: The codebase has been significantly optimized by centralizing data management logic into reusable custom React hooks (useManagement, useBlogManagement, useTravelManagement), making the application more robust and maintainable.
- Dynamic Blog: A full-featured blog with Markdown support, bulk import/export (WordPress XML, Markdown files), and management capabilities including a tabbed interface for published/unpublished posts and individual publish toggles.
- Photo Gallery: A dynamic gallery that preserves all original image metadata (EXIF, dimensions, color profiles) upon upload. It features automatic EXIF data extraction, AI-generated tags, and a unified management interface with Published/Unpublished tabs. Users can bulk update metadata (alt text, tags, purchase links) by uploading a single JSON file. The public gallery search is powerful, covering tags, alt text, filenames, and EXIF data. The image lightbox now includes a 'Purchase' button.
- Interactive Travel Map: A map to pin travel destinations, with bulk import/export and management features.
- Contact Form: A secure, serverless contact form.
- AI Chatbot: An integrated chatbot (the one you are using now) to answer questions about the portfolio, using an editable knowledge base. It includes an auto-generate feature to populate the knowledge base from your content.
- AI-Powered Career Fit Analyst: An advanced tool that analyzes job descriptions against my resume and portfolio content, providing a detailed breakdown of matching areas and potential gaps, with the ability to download the analysis as text or PDF.
- Comprehensive Data Management: The administrator can export, import, and reset all portfolio data.
- User Profile Management: The administrator can update their profile and password.
- Feature Toggles: The administrator can enable or disable entire sections of the portfolio.
- Light & Dark Mode: A theme toggle for user preference.
- Text Readability Controls: Users can adjust base font size and line spacing for a personalized reading experience.
- Fully Responsive: Designed for all devices.
- Enhanced Navigation: All content pages are paginated and can be navigated using keyboard arrows or swipe gestures on mobile.
- CV/Portfolio Page: A dedicated page to display a professional curriculum vitae, with collapsible sections for easy viewing, an enhanced skills display, and print-friendly formatting, including a "Print to PDF" option. The content for this page is fetched from a public JSON Resume Gist.

The tech stack includes React, Vite, TypeScript, Tailwind CSS, shadcn/ui, custom React Hooks for state management, and Supabase for the backend (database, storage, and serverless functions). The AI features are powered by Google Gemini.

The following sections contain the user's personal content available on the site.
---
`;

  if (postsRes.data && postsRes.data.length > 0) {
    context += "\n\n== BLOG POSTS ==\n";
    context += postsRes.data
      .map(
        (p: { title?: string; description?: string; tags?: string[] }) =>
          `Title: ${p.title}\nDescription: ${p.description || "N/A"}\nTags: ${p.tags?.join(", ") || "N/A"}`,
      )
      .join("\n\n");
    context += "\n";
  }

  if (locationsRes.data && locationsRes.data.length > 0) {
    context += "\n\n== TRAVEL LOCATIONS ==\n";
    context += locationsRes.data
      .map(
        (l: { title?: string; name?: string; description?: string }) =>
          `Location: ${l.title} (${l.name})\nDescription: ${l.description || "N/A"}`,
      )
      .join("\n\n");
    context += "\n";
  }

  if (imagesRes.data && imagesRes.data.length > 0) {
    context += "\n\n== GALLERY IMAGES ==\n";
    context += imagesRes.data
      .map(
        (i: { alt_text?: string; tags?: string[] }) =>
          `Image Description: ${i.alt_text || "N/A"}\nTags: ${i.tags?.join(", ") || "N/A"}`,
      )
      .join("\n\n");
    context += "\n";
  }

  if (resumeRes) {
    context += formatResumeData(resumeRes);
  }

  return context.trim();
};

const ManageChatbot = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: "" },
  });

  useEffect(() => {
    const fetchKnowledgeBase = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("chatbot_knowledge")
        .select("content")
        .eq("id", 1)
        .single();

      if (error && error.code !== "PGRST116") {
        // Ignore "0 rows" error
        showError("Failed to load knowledge base.");
        console.error(error);
      } else if (data) {
        form.setValue("content", data.content || "");
      }
      setIsLoading(false);
    };
    fetchKnowledgeBase();
  }, [form]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const toastId = showLoading(
      "Generating knowledge base from your content...",
    );
    try {
      const generatedContent = await generateContextFromData();
      form.setValue("content", generatedContent);
      dismissToast(toastId);
      showSuccess("Knowledge base generated. Review and save.");
    } catch (error: unknown) {
      const err = error as Error;
      dismissToast(toastId);
      showError(`Failed to generate: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("You must be logged in.");
      return;
    }
    setIsSubmitting(true);
    const toastId = showLoading("Saving knowledge base...");
    const { error } = await supabase.from("chatbot_knowledge").upsert({
      id: 1,
      content: values.content,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    });

    dismissToast(toastId);
    if (error) {
      showError(`Failed to save: ${error.message}`);
    } else {
      showSuccess("Knowledge base saved successfully.");
    }
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chatbot Knowledge Base</CardTitle>
        <CardDescription>
          This is the central text the AI chatbot uses to answer questions. You
          can edit it directly or generate a new one from your portfolio
          content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Knowledge Base Content</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[50vh] font-mono text-sm"
                      placeholder="Enter the chatbot's knowledge base here..."
                      {...field}
                      disabled={isLoading || isGenerating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoading || isSubmitting || isGenerating}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Knowledge Base
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerate}
                disabled={isLoading || isSubmitting || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate from Portfolio
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ManageChatbot;
