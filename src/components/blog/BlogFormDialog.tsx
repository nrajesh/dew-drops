import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { generateAltTextFromFileName } from "@/lib/utils";
import type { Post, GalleryImage } from "@/types";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().max(500, "Description cannot exceed 500 characters.").optional(),
  content: z.string().min(1, "Content is required"),
  published_at: z.date().optional().nullable(),
  published: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  cover_image_id: z.string().optional().nullable(),
  youtube_video_id: z.string().optional().nullable(),
});

export type BlogFormValues = z.infer<typeof formSchema>;

interface BlogFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingPost: Post | null;
  galleryImages: GalleryImage[];
  uniqueTags: string[];
  onSubmit: (values: Omit<BlogFormValues, 'published_at'> & { published_at: string | null }) => void; // Adjusted onSubmit type
}

export const BlogFormDialog: React.FC<BlogFormDialogProps> = ({
  isOpen,
  onOpenChange,
  editingPost,
  galleryImages,
  uniqueTags,
  onSubmit,
}) => {
  const form = useForm<BlogFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      published_at: null,
      published: false,
      tags: [],
      cover_image_id: "--none--",
      youtube_video_id: "",
    },
  });

  useEffect(() => {
    if (editingPost) {
      form.reset({
        title: editingPost.title,
        description: editingPost.description || "",
        content: editingPost.content || "",
        published_at: editingPost.published_at ? new Date(editingPost.published_at) : null,
        published: editingPost.published,
        tags: editingPost.tags || [],
        cover_image_id: editingPost.cover_image_id || "--none--",
        youtube_video_id: editingPost.youtube_video_id || "",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        content: "",
        published_at: null,
        published: false,
        tags: [],
        cover_image_id: "--none--",
        youtube_video_id: "",
      });
    }
  }, [editingPost, form]);

  const handleFormSubmit = (values: BlogFormValues) => {
    // Convert Date object to ISO string before passing to onSubmit
    const submittedValues = {
      ...values,
      published_at: values.published_at ? values.published_at.toISOString() : null,
    };
    onSubmit(submittedValues);
    // The parent component will handle closing the dialog and resetting editingPost
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
          <DialogDescription>
            {editingPost ? "Update the details of your blog post." : "Fill in the details for your new blog post."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Blog Post" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A short summary of the post..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (Markdown)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Write your blog post content here using Markdown..." rows={15} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      placeholder="Select or create tags..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cover_image_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "--none--"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a cover image (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="--none--">No Cover Image</SelectItem>
                        {galleryImages.map((image) => (
                          <SelectItem key={image.id} value={image.id}>
                            {image.alt_text || generateAltTextFromFileName(image.file_name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="youtube_video_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Video ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., dQw4w9WgXcQ" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center space-x-4">
              <FormField
                control={form.control}
                name="published_at"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Publish Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="w-[240px] pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Published
                      </FormLabel>
                      <FormDescription>
                        If checked, this post will be visible on the blog.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};