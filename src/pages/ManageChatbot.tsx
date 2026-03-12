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
import {
  showError,
  showLoading,
  showSuccess,
  dismissToast,
} from "@/utils/toast";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { localDataProvider } from "@/lib/LocalDataProvider";
import type { Post, TravelLocation, GalleryImage } from "@/types";
import type { ResumeReference } from "@/types/resume";

const formSchema = z.object({
  content: z.string().min(1, "Knowledge base content is required"),
});

const RESUME_URL = import.meta.env.VITE_RESUME_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatResumeData = (resume: any): string => {
  let resumeContext = "\n\n== RESUME DATA ==\n";
  if (resume.basics) {
    resumeContext += `Name: ${resume.basics.name}\nLabel: ${resume.basics.label}\nSummary: ${resume.basics.summary}\n`;
  }
  if (resume.work && resume.work.length > 0) {
    resumeContext += "\nWORK EXPERIENCE:\n";
    resumeContext += resume.work
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (w: any) =>
          `- ${w.company || w.name} (${w.position}): ${w.summary || ""}`,
      )
      .join("\n");
  }
  if (resume.skills && resume.skills.length > 0) {
    resumeContext += "\n\nSKILLS:\n";
    resumeContext += resume.skills
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) =>
          `- ${s.name}: ${s.keywords?.join(", ") || ""}`,
      )
      .join("\n");
  }
  if (resume.references && resume.references.length > 0) {
    resumeContext += "\n\nREFERENCES:\n";
    resumeContext += resume.references
      .map((ref: ResumeReference) => `- ${ref.name}: ${ref.reference}`)
      .join("\n");
    resumeContext += "\n";
  }
  return resumeContext;
};

const generateContextFromData = async (): Promise<string> => {
  const posts = localDataProvider
    .getPosts()
    .filter((p) => p.published)
    .slice(0, 20);
  const locations = localDataProvider.getTravelLocations().slice(0, 20);
  const images = localDataProvider
    .getGalleryImages()
    .filter((i) => i.published)
    .slice(0, 30);

  let resumeRes = null;
  if (RESUME_URL) {
    try {
      const res = await fetch(RESUME_URL);
      if (res.ok) resumeRes = await res.json();
    } catch (e) {
      console.warn("Generating context: Failed to fetch resume.", e);
    }
  }

  let context = `
PORTFOLIO KNOWLEDGE BASE:

== ABOUT THE PORTFOLIO APPLICATION ==
This is a personal portfolio and blog application.
---
`;

  if (posts && posts.length > 0) {
    context += "\n\n== BLOG POSTS ==\n";
    context += posts
      .map(
        (p: Post) =>
          `Title: ${p.title}\nDescription: ${p.description || "N/A"}\nTags: ${p.tags?.join(", ") || "N/A"}`,
      )
      .join("\n\n");
    context += "\n";
  }

  if (locations && locations.length > 0) {
    context += "\n\n== TRAVEL LOCATIONS ==\n";
    context += locations
      .map(
        (l: TravelLocation) =>
          `Location: ${l.name}\nDescription: ${l.description || "N/A"}`,
      )
      .join("\n\n");
    context += "\n";
  }

  if (images && images.length > 0) {
    context += "\n\n== GALLERY IMAGES ==\n";
    context += images
      .map(
        (i: GalleryImage) =>
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
  const { session } = useAuth();
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
      const data = localDataProvider.getChatbotKnowledge();
      if (data && data.length > 0) {
        form.setValue("content", data[0].content || "");
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
    if (!session) {
      showError("You must be logged in.");
      return;
    }
    setIsSubmitting(true);
    const toastId = showLoading("Saving knowledge base...");
    try {
      // Simulate local save
      await new Promise((resolve) => setTimeout(resolve, 800));
      console.log(
        "Saving chatbot knowledge base locally (Simulation):",
        values,
      );
      dismissToast(toastId);
      showSuccess(
        "Knowledge base saved successfully (Simulation: local preview mode).",
      );
    } catch (error: unknown) {
      const err = error as Error;
      dismissToast(toastId);
      showError(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
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
