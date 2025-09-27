import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Loader2, Sparkles } from "lucide-react";
import type { Post, TravelLocation, GalleryImage } from "@/types";
import type { JsonResume, ResumeWork, ResumeEducation, ResumeSkill, ResumeAward, ResumeLanguage, ResumeInterest, ResumePublication, ResumeReference } from "@/types/resume"; // Import all resume types

const formSchema = z.object({
  content: z.string().min(10, "Knowledge base content must be at least 10 characters."),
});

const RESUME_URL = "https://gist.githubusercontent.com/nrajesh/773fb6b9372c3c44e08a47fea36644f/raw/resume.json"; // Ensure this matches the URL in CurriculumVitae.tsx

const generateContextFromData = async (): Promise<string> => {
  const [postsRes, locationsRes, imagesRes, resumeRes] = await Promise.all([
    supabase.from('posts').select('title, description, tags').eq('published', true).limit(20),
    supabase.from('travel_locations').select('title, name, description').eq('published', true).limit(20),
    supabase.from('gallery_images').select('alt_text, tags').eq('published', true).limit(30),
    fetch(RESUME_URL).then(res => res.ok ? res.json() : null).catch(e => { console.error("Failed to fetch resume for chatbot context:", e); return null; }),
  ]);

  let context = `
PORTFOLIO KNOWLEDGE BASE:

== ABOUT THE PORTFOLIO APPLICATION ==
This is a personal portfolio and blog application designed to showcase work, thoughts, and travels.
Key Features:
- Dynamic Blog: A full-featured blog with Markdown support, bulk import/export, and management capabilities.
- Photo Gallery: A dynamic gallery with automatic EXIF data extraction, AI-generated tags, and a unified management interface with Published/Unpublished tabs. Gallery search now includes tags, alt text, filenames, and EXIF data.
- Interactive Travel Map: A map to pin travel destinations, with bulk import/export and management features.
- Contact Form: A secure, serverless contact form.
- AI Chatbot: An integrated chatbot (the one you are using now) to answer questions about the portfolio, using an editable knowledge base. It includes an auto-generate feature to populate the knowledge base from your content.
- Comprehensive Data Management: The administrator can export and import all portfolio data.
- User Profile Management: The administrator can update their profile and password.
- Feature Toggles: The administrator can enable or disable entire sections of the portfolio.
- Light & Dark Mode: A theme toggle for user preference.
- Text Readability Controls: Users can adjust base font size and line spacing for a personalized reading experience.
- Fully Responsive: Designed for all devices.
- Enhanced Navigation: All content pages are paginated and can be navigated using keyboard arrows or swipe gestures on mobile.
- CV/Portfolio Page: A dedicated page to display a professional curriculum vitae, with collapsible sections for easy viewing and printing. The content for this page is fetched from a public JSON Resume Gist.

The tech stack includes React, Vite, TypeScript, Tailwind CSS, shadcn/ui, and Supabase for the backend (database, storage, and serverless functions). The AI features are powered by Google Gemini.

The following sections contain the user's personal content available on the site.
---
`;

  if (postsRes.data && postsRes.data.length > 0) {
    context += "\n\n== BLOG POSTS ==\n";
    postsRes.data.forEach((p: any) => {
      context += `Title: ${p.title}\nDescription: ${p.description}\nTags: ${p.tags?.join(', ') || 'N/A'}\n\n`;
    });
  }

  if (locationsRes.data && locationsRes.data.length > 0) {
    context += "== TRAVEL LOCATIONS ==\n";
    locationsRes.data.forEach((l: any) => {
      context += `Location: ${l.title} (${l.name})\nDescription: ${l.description}\n\n`;
    });
  }

  if (imagesRes.data && imagesRes.data.length > 0) {
    context += "== GALLERY IMAGES ==\n";
    imagesRes.data.forEach((i: any) => {
      if (i.alt_text) {
        context += `Image Description: ${i.alt_text}\nTags: ${i.tags?.join(', ') || 'N/A'}\n\n`;
      }
    });
  }

  if (resumeRes) {
    const resumeData: JsonResume = resumeRes;
    context += "\n\n== CURRICULUM VITAE (PORTFOLIO) ==\n";
    if (resumeData.basics) {
      context += `Name: ${resumeData.basics.name}\n`;
      context += `Title: ${resumeData.basics.label}\n`;
      if (resumeData.basics.summary) context += `Summary: ${resumeData.basics.summary}\n`;
      if (resumeData.basics.email) context += `Email: ${resumeData.basics.email}\n`;
      if (resumeData.basics.phone) context += `Phone: ${resumeData.basics.phone}\n`;
      if (resumeData.basics.url) context += `Website: ${resumeData.basics.url}\n`;
      if (resumeData.basics.location?.city) context += `Location: ${resumeData.basics.location.city}, ${resumeData.basics.location.countryCode}\n`;
      
      if (resumeData.basics.profiles && resumeData.basics.profiles.length > 0) {
        context += "\nSocial Profiles:\n";
        resumeData.basics.profiles.forEach((profile) => {
          context += `- ${profile.network}: ${profile.url}\n`;
        });
      }
    }
    if (resumeData.work && resumeData.work.length > 0) {
      context += "\nWork Experience:\n";
      resumeData.work.forEach((job: ResumeWork) => {
        context += `- ${job.position} at ${job.company} (${job.startDate} - ${job.endDate || 'Present'})\n`;
        if (job.location) context += `  Location: ${job.location}\n`;
        if (job.summary) context += `  Summary: ${job.summary}\n`;
        if (job.highlights && job.highlights.length > 0) {
          context += `  Highlights: ${job.highlights.join('; ')}\n`;
        }
      });
    }
    if (resumeData.education && resumeData.education.length > 0) {
      context += "\nEducation:\n";
      resumeData.education.forEach((edu: ResumeEducation) => {
        context += `- ${edu.studyType} in ${edu.area} from ${edu.institution} (${edu.startDate} - ${edu.endDate || 'Present'})\n`;
        if (edu.gpa) context += `  GPA: ${edu.gpa}\n`;
        if (edu.courses && edu.courses.length > 0) {
          context += `  Courses: ${edu.courses.join(', ')}\n`;
        }
      });
    }
    if (resumeData.skills && resumeData.skills.length > 0) {
      context += "\nSkills:\n";
      resumeData.skills.forEach((skill: ResumeSkill) => {
        context += `- ${skill.name} (Level: ${skill.level || 'N/A'})`;
        if (skill.keywords && skill.keywords.length > 0) {
          context += ` Keywords: ${skill.keywords.join(', ')}\n`;
        } else {
          context += '\n';
        }
      });
    }
    if (resumeData.awards && resumeData.awards.length > 0) {
      context += "\nAwards:\n";
      resumeData.awards.forEach((award: ResumeAward) => {
        context += `- ${award.title} from ${award.awarder} on ${award.date}\n`;
        if (award.summary) context += `  Summary: ${award.summary}\n`;
      });
    }
    if (resumeData.publications && resumeData.publications.length > 0) {
      context += "\nPublications:\n";
      resumeData.publications.forEach((pub: ResumePublication) => {
        context += `- ${pub.name} by ${pub.publisher} (${pub.releaseDate})\n`;
        if (pub.website) context += `  Link: ${pub.website}\n`;
        if (pub.summary) context += `  Summary: ${pub.summary}\n`;
      });
    }
    if (resumeData.languages && resumeData.languages.length > 0) {
      context += "\nLanguages:\n";
      resumeData.languages.forEach((lang: ResumeLanguage) => {
        context += `- ${lang.language} (Fluency: ${lang.fluency})\n`;
      });
    }
    if (resumeData.interests && resumeData.interests.length > 0) {
      context += "\nInterests:\n";
      resumeData.interests.forEach((interest: ResumeInterest) => {
        context += `- ${interest.name}`;
        if (interest.keywords && interest.keywords.length > 0) {
          context += ` Keywords: ${interest.keywords.join(', ')}\n`;
        } else {
          context += '\n';
        }
      });
    }
    if (resumeData.references && resumeData.references.length > 0) {
      context += "\nReferences:\n";
      resumeData.references.forEach((ref: ResumeReference) => {
        context += `- ${ref.name}: ${ref.reference}\n`;
      });
    }
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

      if (error && error.code !== 'PGRST116') { // Ignore "0 rows" error
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
    const toastId = showLoading("Generating knowledge base from your content...");
    try {
      const generatedContent = await generateContextFromData();
      form.setValue("content", generatedContent);
      dismissToast(toastId);
      showSuccess("Knowledge base generated. Review and save.");
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Failed to generate: ${error.message}`);
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
    const { error } = await supabase
      .from("chatbot_knowledge")
      .upsert({
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
          This is the central text the AI chatbot uses to answer questions. You can edit it directly or generate a new one from your portfolio content.
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
              <Button type="submit" disabled={isLoading || isSubmitting || isGenerating}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Knowledge Base
              </Button>
              <Button type="button" variant="outline" onClick={handleGenerate} disabled={isLoading || isSubmitting || isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
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