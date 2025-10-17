import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"; // Added FormDescription
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError, showLoading, dismissToast, updateToastSuccess, updateToastError } from "@/utils/toast"; // Added updateToastSuccess, updateToastError
import { PostList } from "@/components/blog/PostList";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import {
  fetchPosts,
  fetchGalleryImages,
  processUploads,
  parseWordPressXml,
  parseMarkdownFile,
  handleBulkDelete,
  handleBulkTagUpdate,
  handleBulkStatusChange,
  handleBulkDownload,
  extractDescriptionFromContent,
  ensureContentHasTripleBackticks,
} from "@/components/blog/BlogManagementUtils";
import type { Post, GalleryImage } from "@/types";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { generateAltTextFromFileName, normalizeTag } from "@/lib/utils";

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

const ManageBlog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState(""); // State for search term

  const containerRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      published_at: null,
      published: false,
      tags: [],
      cover_image_id: null,
      youtube_video_id: null,
    },
  });

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    const [fetchedPosts, fetchedImages] = await Promise.all([
      fetchPosts(),
      fetchGalleryImages(),
    ]);
    setPosts(fetchedPosts);
    setGalleryImages(fetchedImages);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (editingPost) {
      form.reset({
        title: editingPost.title,
        description: editingPost.description || "",
        content: editingPost.content,
        published_at: editingPost.published_at ? new Date(editingPost.published_at) : null,
        published: editingPost.published,
        tags: editingPost.tags || [],
        cover_image_id: editingPost.cover_image_id,
        youtube_video_id: editingPost.youtube_video_id,
      });
      setIsDialogOpen(true);
    } else {
      form.reset({
        title: "",
        description: "",
        content: "",
        published_at: null,
        published: false,
        tags: [],
        cover_image_id: null,
        youtube_video_id: null,
      });
    }
  }, [editingPost, form]);

  const filteredPosts = useMemo(() => {
    if (!searchTerm) return posts;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return posts.filter(post =>
      post.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      (post.description && post.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (post.content && post.content.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (post.tags && post.tags.some(tag => normalizeTag(tag).toLowerCase().includes(lowerCaseSearchTerm)))
    );
  }, [posts, searchTerm]);

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPosts.slice(startIndex, endIndex);
  }, [filteredPosts, currentPage, itemsPerPage]);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !isDialogOpen,
  });

  const uniqueTags = useMemo(() => {
    const allTags = posts.flatMap(post => post.tags || []);
    return Array.from(new Set(allTags.map(normalizeTag))).sort();
  }, [posts]);

  const handleAddOrUpdatePost = async (values: z.infer<typeof formSchema>) => {
    const toastId = showLoading(editingPost ? "Updating post..." : "Adding post...");
    try {
      const postData = {
        title: values.title,
        description: values.description || extractDescriptionFromContent(values.content),
        content: ensureContentHasTripleBackticks(values.content),
        published_at: values.published_at?.toISOString() || null,
        published: values.published,
        tags: values.tags && values.tags.length > 0 ? values.tags.map(normalizeTag) : null,
        cover_image_id: values.cover_image_id,
        youtube_video_id: values.youtube_video_id,
      };

      if (editingPost) {
        const { error } = await supabase.from("posts").update(postData).eq("id", editingPost.id);
        if (error) throw error;
        updateToastSuccess(toastId, "Post updated successfully!");
      } else {
        const { error } = await supabase.from("posts").insert({ ...postData, user_id: (await supabase.auth.getUser()).data.user?.id });
        if (error) throw error;
        updateToastSuccess(toastId, "Post added successfully!");
      }
      setIsDialogOpen(false);
      setEditingPost(null);
      form.reset();
      fetchAllData();
    } catch (error: any) {
      updateToastError(toastId, `Operation failed: ${error.message}`);
    }
  };

  const handleSelectPost = (id: string) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPostIds = new Set(paginatedPosts.map(post => post.id));
      setSelectedPosts(allPostIds);
    } else {
      setSelectedPosts(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    const success = await handleBulkDelete(Array.from(selectedPosts), posts);
    if (success) {
      setSelectedPosts(new Set());
      fetchAllData();
    }
  };

  const handleBulkTagUpdateWrapper = async (tags: string[]) => {
    const success = await handleBulkTagUpdate(selectedPosts, tags);
    if (success) {
      setSelectedPosts(new Set());
      fetchAllData();
    }
  };

  const handleBulkStatusChangeWrapper = async (published: boolean) => {
    const success = await handleBulkStatusChange(selectedPosts, published);
    if (success) {
      setSelectedPosts(new Set());
      fetchAllData();
    }
  };

  const handleBulkDownloadWrapper = async () => {
    await handleBulkDownload(selectedPosts, posts);
    setSelectedPosts(new Set());
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setUploadFiles(Array.from(event.target.files));
    }
  };

  const handleProcessUploads = async () => {
    if (uploadFiles.length === 0) {
      showError("No files selected for upload.");
      return;
    }

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      showError("User not authenticated.");
      return;
    }

    const inserts: Omit<Post, 'id' | 'created_at' | 'user_id'>[] = [];
    const updates: { existingId: string; newData: Omit<Post, 'id' | 'created_at' | 'user_id'> }[] = [];

    const existingPostTitles = new Set(posts.map(p => p.title));

    for (const file of uploadFiles) {
      if (file.type === "text/xml") {
        const xmlString = await file.text();
        const parsedPosts = await parseWordPressXml(xmlString);
        parsedPosts.forEach(newPost => {
          if (existingPostTitles.has(newPost.title)) {
            const existingPost = posts.find(p => p.title === newPost.title);
            if (existingPost) {
              updates.push({ existingId: existingPost.id, newData: newPost });
            }
          } else {
            inserts.push(newPost);
          }
        });
      } else if (file.name.endsWith(".md")) {
        const parsedPost = await parseMarkdownFile(file);
        if (existingPostTitles.has(parsedPost.title)) {
          const existingPost = posts.find(p => p.title === parsedPost.title);
          if (existingPost) {
            updates.push({ existingId: existingPost.id, newData: parsedPost });
          }
        } else {
          inserts.push(parsedPost);
        }
      } else {
        showError(`Unsupported file type: ${file.name}`);
      }
    }

    const success = await processUploads(userId, inserts, updates);
    if (success) {
      setUploadFiles([]);
      fetchAllData();
    }
  };

  return (
    <div className="space-y-8" ref={containerRef}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Blog Posts</h1>
        <div className="flex gap-2">
          <Input type="file" multiple onChange={handleFileUpload} accept=".xml,.md" className="max-w-xs" />
          {uploadFiles.length > 0 && (
            <Button onClick={handleProcessUploads}>Process Uploads ({uploadFiles.length})</Button>
          )}
          <Button onClick={() => setIsDialogOpen(true)}>Create New Post</Button>
        </div>
      </div>

      <div className="w-full">
        <PostList
          posts={paginatedPosts}
          selectedPosts={selectedPosts}
          onSelectPost={handleSelectPost}
          onSelectAll={handleSelectAll}
          onEdit={(post) => setEditingPost(post)}
          onDelete={handleDeleteSelected}
          onDownload={handleBulkDownloadWrapper}
          onBulkTagUpdate={handleBulkTagUpdateWrapper}
          onBulkStatusChange={handleBulkStatusChangeWrapper}
          uniqueTags={uniqueTags}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          totalItems={filteredPosts.length}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) {
          setEditingPost(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
            <DialogDescription>
              {editingPost ? "Update the details of your blog post." : "Fill in the details for your new blog post."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddOrUpdatePost)} className="space-y-4">
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a cover image (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No Cover Image</SelectItem>
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
                        <Input placeholder="e.g., dQw4w9WgXcQ" {...field} />
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
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingPost ? "Save Changes" : "Create Post"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageBlog;