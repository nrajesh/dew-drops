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
import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "../ui/checkbox";
import WysiwygEditor from "./WysiwygEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
}

export const BlogForm = ({ editingPost, galleryImages, uniqueTags, onSubmit, onCancel }: BlogFormProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');

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

  const handleEditContent = () => {
    setEditContent(form.getValues('content'));
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    form.setValue('content', editContent);
    setIsEditDialogOpen(false);
  };

  return (
    <>
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
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleEditContent}
                >
                  Edit Content (Markdown)
                </Button>
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="prose dark:prose-invert max-w-none p-4 border rounded-md min-h-[150px] overflow-auto">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {field.value}
                          </ReactMarkdown>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingPost ? "Update Post" : "Add Post"}</Button>
                {editingPost && <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Post Content</DialogTitle>
            <DialogDescription>
              Make changes to the post content below. You can use Markdown formatting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="prose dark:prose-invert max-w-none p-4 border rounded-md min-h-[300px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editContent}
                </ReactMarkdown>
              </div>
            </div>
            <div className="mt-4">
              <WysiwygEditor
                value={editContent}
                onChange={setEditContent}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};