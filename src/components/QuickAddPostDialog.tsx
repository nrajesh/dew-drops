import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { GalleryImage, Post } from "@/types";
import TurndownService from "turndown";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill's CSS

const postSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().max(500, "Description cannot exceed 500 characters.").optional(),
  content: z.string().min(20, { message: "Content must be at least 20 characters." }),
  published_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format." }),
  published: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  cover_image_id: z.preprocess(
    (val) => (val === "--none--" || val === "" ? null : val),
    z.string().uuid("Invalid image ID").nullable().optional()
  ),
  youtube_video_id: z.string().min(11, "YouTube ID must be 11 characters").max(11, "YouTube ID must be 11 characters").optional().or(z.literal('')).transform(val => val === '' ? null : val),
});

type PostFormData = z.infer<typeof postSchema>;

interface QuickAddPostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPostAdded: () => void;
}

const turndownService = new TurndownService();

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    ['link', 'image', 'code-block'],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'link', 'image', 'code-block',
];

export const QuickAddPostDialog = ({ isOpen, onClose, onPostAdded }: QuickAddPostDialogProps) => {
  const { user } = useAuth();
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      published_at: new Date().toISOString().split("T")[0],
      published: false,
      tags: [],
      cover_image_id: null,
      youtube_video_id: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: "",
        description: "",
        content: "",
        published_at: new Date().toISOString().split("T")[0],
        published: false,
        tags: [],
        cover_image_id: null,
        youtube_video_id: "",
      });
      fetchGalleryImages();
      fetchUniqueTags();
    }
  }, [isOpen, form]);

  const fetchGalleryImages = async () => {
    const { data, error } = await supabase.from("gallery_images").select("id, image_url, alt_text").order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching gallery images:", error);
    } else {
      setGalleryImages(data as GalleryImage[]);
    }
  };

  const fetchUniqueTags = async () => {
    const { data, error } = await supabase.from("posts").select("tags");
    if (error) {
      console.error("Error fetching unique tags:", error);
    } else {
      const allTags = new Set<string>();
      data.forEach(post => {
        if (post.tags) {
          post.tags.forEach(tag => allTags.add(tag));
        }
      });
      setUniqueTags(Array.from(allTags).sort());
    }
  };

  async function onSubmit(values: PostFormData) {
    if (!user) {
      showError("You must be logged in to add blog posts.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Adding new post...");

    try {
      // Convert HTML content from Quill to Markdown
      const markdownContent = turndownService.turndown(values.content);

      let description = values.description;
      if (!description || description.trim() === '') {
          const codeBlockRegex = /```([\s\S]*?)```/;
          const match = markdownContent.match(codeBlockRegex);
          if (match && match[1]) {
              let extractedDescription = match[1].trim();
              if (extractedDescription.length > 500) {
                  extractedDescription = extractedDescription.substring(0, 497) + '...';
              }
              description = extractedDescription;
          }
      }

      const postData = { 
        ...values,
        content: markdownContent, // Save as Markdown
        description: description,
        user_id: user.id,
      };

      const { error } = await supabase.from("posts").insert(postData);

      dismissToast(toastId);
      if (error) {
        throw error;
      } else {
        showSuccess("Post added successfully!");
        onPostAdded();
        onClose();
      }
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
      console.error("Failed to add post:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Quick Add New Blog Post</DialogTitle>
          <DialogDescription>
            Create a new article. The content editor supports rich text formatting.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-4 -mr-4"> {/* Added pr-4 and -mr-4 to compensate for scrollbar */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Your Post Title" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex items-center justify-between gap-4">
                <FormField control={form.control} name="published_at" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Publication Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-start pt-8">
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Published</FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Input placeholder="A short summary of the post." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <MultiSelectPopover
                        suggestions={uniqueTags}
                        value={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cover_image_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a gallery image" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="--none--">No Cover Image</SelectItem>
                        {galleryImages.map((image) => (
                          <SelectItem key={image.id} value={image.id}>
                            <div className="flex items-center gap-2">
                              <img src={image.image_url} alt={image.alt_text || "Gallery image"} className="h-8 w-8 object-cover rounded-sm" />
                              <span>{image.alt_text || `Image ${image.id.substring(0, 8)}`}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {field.value && field.value !== '--none--' && (
                      <div className="mt-2">
                        <img 
                          src={galleryImages.find(img => img.id === field.value)?.image_url || ""} 
                          alt="Selected cover preview" 
                          className="w-32 h-auto rounded-md border"
                        />
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="youtube_video_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube Video ID (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., dQw4w9WgXcQ" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <ReactQuill
                      theme="snow"
                      value={field.value}
                      onChange={field.onChange}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Write your full article here..."
                      className="min-h-[200px] [&_.ql-container]:min-h-[150px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="pt-6">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Post"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};