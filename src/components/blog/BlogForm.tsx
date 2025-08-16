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

const postSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().max(500, "Description cannot exceed 500 characters.").optional(),
  content: z.string().min(20, { message: "Content must be at least 20 characters." }),
  published_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format." }),
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
}

export const BlogForm = ({ editingPost, galleryImages, uniqueTags, onSubmit, onCancel }: BlogFormProps) => {
  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      published_at: new Date().toISOString().split("T")[0],
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
        tags: [],
        cover_image_id: null,
        youtube_video_id: "",
      });
    }
  }, [editingPost, form]);

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Your Post Title" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="published_at" render={({ field }) => (
              <FormItem><FormLabel>Publication Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="A short summary of the post." {...field} /></FormControl><FormMessage /></FormItem>
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
              <FormItem><FormLabel>Content (Markdown supported)</FormLabel><FormControl><Textarea placeholder="Write your full article here..." className="min-h-[200px]" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex gap-2">
              <Button type="submit">{editingPost ? "Update Post" : "Add Post"}</Button>
              {editingPost && <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};