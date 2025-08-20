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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";
import type { GalleryImage, Post } from "@/types";
import { useEffect } from "react";
import { Checkbox } from "../ui/checkbox";

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

export type PostFormData = z.infer<typeof postSchema>;

interface BlogFormProps {
  editingPost: Post | null;
  galleryImages: GalleryImage[];
  uniqueTags: string[];
  onSubmit: (values: PostFormData) => void;
  onCancel: () => void;
  isPopup?: boolean;
}

export const BlogForm = ({ editingPost, galleryImages, uniqueTags, onSubmit, onCancel, isPopup = false }: BlogFormProps) => {
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
    if (editingPost) {
      form.reset({
        title: editingPost.title,
        description: editingPost.description || "",
        content: editingPost.content || "",
        published_at: editingPost.published_at ? editingPost.published_at.split("T")[0] : new Date().toISOString().split("T")[0],
        published: editingPost.published,
        tags: editingPost.tags || [],
        cover_image_id: editingPost.cover_image_id || null,
        youtube_video_id: editingPost.youtube_video_id || "",
      });
    } else {
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
    }
  }, [editingPost, form]);

  const handleSubmit = (values: PostFormData) => {
    // Auto-fill description if it's blank
    let description = values.description;
    if (!description || description.trim() === '') {
      // Extract the first paragraph from the content
      const firstParagraphMatch = values.content.match(/^([^#\n]+)/);
      if (firstParagraphMatch) {
        description = firstParagraphMatch[0].trim();
        if (description.length > 500) {
          description = description.substring(0, 497) + '...';
        }
      }
    }

    onSubmit({
      ...values,
      description: description
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingPost ? "Edit Post" : "Add New Post"}</CardTitle>
        <CardDescription>
          {editingPost ? "Update the details for this blog post." : "Create a new article. You can use Markdown for the content."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Your Post Title" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="published" render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Publish</FormLabel>
                    </div>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="A short description of your post..." className="h-full" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem><FormLabel>Content (Markdown supported)</FormLabel><FormControl><Textarea placeholder="Write your full article here..." className="min-h-[250px]" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="published_at" render={({ field }) => (
                <FormItem><FormLabel>Publish Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiSelectPopover suggestions={uniqueTags} value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="cover_image_id" render={({ field }) => (
                <FormItem><FormLabel>Cover Image (Optional)</FormLabel><FormControl>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger><SelectValue placeholder="Select a cover image" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="--none--">None</SelectItem>
                      {galleryImages.map((image) => (
                        <SelectItem key={image.id} value={image.id}>
                          {image.alt_text || "Untitled Image"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="youtube_video_id" render={({ field }) => (
                <FormItem><FormLabel>YouTube Video ID (Optional)</FormLabel><FormControl><Input placeholder="e.g., dQw4w9WgXcQ" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit">{editingPost ? "Update Post" : "Add Post"}</Button>
              {editingPost && <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};