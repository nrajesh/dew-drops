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

const formSchema = z.object({
  content: z.string().min(10, "Knowledge base content must be at least 10 characters."),
});

const generateContextFromData = async (): Promise<string> => {
  const [postsRes, locationsRes, imagesRes] = await Promise.all([
    supabase.from('posts').select('title, description, tags').eq('published', true).limit(20),
    supabase.from('travel_locations').select('title, name, description').eq('published', true).limit(20),
    supabase.from('gallery_images').select('alt_text, tags').eq('published', true).limit(30),
  ]);

  let context = "PORTFOLIO KNOWLEDGE BASE:\n\n";

  if (postsRes.data && postsRes.data.length > 0) {
    context += "== BLOG POSTS ==\n";
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

  return context;
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

      if (error) {
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
      .update({
        content: values.content,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

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