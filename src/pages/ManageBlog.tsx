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
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useState, useEffect, useRef } from "react";
import { Trash2, Edit, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Post, GalleryImage } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import TurndownService from "turndown";
import JSZip from 'jszip';
import { sanitizeFileName } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const postSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  content: z.string().min(20, { message: "Content must be at least 20 characters." }),
  published_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format." }),
  tags: z.string().optional(),
  cover_image_id: z.preprocess(
    (val) => (val === "--none--" || val === "" ? null : val),
    z.string().uuid("Invalid image ID").nullable().optional()
  ),
  youtube_video_id: z.string().min(11, "YouTube ID must be 11 characters").max(11, "YouTube ID must be 11 characters").optional().or(z.literal('')).transform(val => val === '' ? null : val),
});

type NewPost = Omit<Post, 'id' | 'created_at' | 'user_id'>;

const ManageBlog = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const turndownService = new TurndownService();

  // State for the update confirmation dialog
  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [postsToInsert, setPostsToInsert] = useState<NewPost[]>([]);
  const [postsToUpdate, setPostsToUpdate] = useState<{ existingId: string; existingTitle: string; newData: NewPost }[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPosts();
    fetchGalleryImages();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase.from("posts").select("*").order("published_at", { ascending: false });
    if (error) {
      showError("Failed to fetch posts.");
      console.error(error);
    } else {
      setPosts(data as Post[]);
    }
  };

  const fetchGalleryImages = async () => {
    const { data, error } = await supabase.from("gallery_images").select("id, image_url, alt_text").order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching gallery images:", error);
    } else {
      setGalleryImages(data as GalleryImage[]);
    }
  };

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      published_at: new Date().toISOString().split("T")[0],
      tags: "",
      cover_image_id: null,
      youtube_video_id: "",
    },
  });

  async function onSubmit(values: z.infer<typeof postSchema>) {
    if (!user) {
      showError("You must be logged in to manage blog posts.");
      return;
    }

    const toastId = showLoading(editingId ? "Updating post..." : "Adding new post...");
    
    const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : null;

    const postData = { 
      title: values.title,
      description: values.description,
      content: values.content,
      published_at: values.published_at,
      user_id: user.id,
      tags: tagsArray,
      cover_image_id: values.cover_image_id,
      youtube_video_id: values.youtube_video_id,
    };

    const { error } = editingId
      ? await supabase.from("posts").update(postData).eq("id", editingId)
      : await supabase.from("posts").insert(postData);

    dismissToast(toastId);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Post ${editingId ? "updated" : "added"} successfully!`);
      cancelEdit();
      fetchPosts();
    }
  }

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    form.reset({
      title: post.title,
      description: post.description || "",
      content: post.content || "",
      published_at: post.published_at ? post.published_at.split("T")[0] : new Date().toISOString().split("T")[0],
      tags: post.tags ? post.tags.join(', ') : "",
      cover_image_id: post.cover_image_id || null,
      youtube_video_id: post.youtube_video_id || "",
    });
  };

  const handleBulkDelete = async () => {
    const toastId = showLoading(`Deleting ${selectedPosts.size} posts...`);
    const { error } = await supabase.from("posts").delete().in("id", Array.from(selectedPosts));
    dismissToast(toastId);
    if (error) {
      showError(error.message);
    } else {
      showError(`${selectedPosts.size} posts removed.`);
      fetchPosts();
      setSelectedPosts(new Set());
    }
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    form.reset({
      title: "",
      description: "",
      content: "",
      published_at: new Date().toISOString().split("T")[0],
      tags: "",
      cover_image_id: null,
      youtube_video_id: "",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const parseWordPressXml = async (xmlString: string): Promise<NewPost[]> => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const items = xmlDoc.querySelectorAll("item");
    const newPosts: NewPost[] = [];

    items.forEach(item => {
      const title = item.querySelector("title")?.textContent || "";
      const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
      const description = item.querySelector("description")?.textContent || "";
      const contentHtml = item.getElementsByTagNameNS("*", "encoded")[0]?.textContent || "";
      const content = turndownService.turndown(contentHtml);
      const tags: string[] | null = null;
      const cover_image_id: string | null = null;
      const youtube_video_id: string | null = null;

      if (title && content) {
        newPosts.push({
          title,
          description,
          content,
          published_at: new Date(pubDate).toISOString(),
          tags,
          cover_image_id,
          youtube_video_id,
        });
      }
    });
    return newPosts;
  };

  const parseMarkdownFile = async (file: File): Promise<NewPost> => {
    const fullContent = await file.text();
    let title = file.name.replace(/\.md$/, '');
    let description = '';
    let published_at = new Date().toISOString();
    let content = fullContent;
    let tags: string[] | null = null;
    let cover_image_id: string | null = null;
    let youtube_video_id: string | null = null;

    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = fullContent.match(frontmatterRegex);

    if (match) {
      const frontmatterContent = match[1];
      content = match[2].trim();

      frontmatterContent.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(':').trim().replace(/^"|"$/g, '').replace(/\\"/g, '"'); 
          if (key === 'title') {
            title = value;
          } else if (key === 'description') {
            description = value;
          } else if (key === 'published_at') {
            published_at = value;
          } else if (key === 'tags') {
            tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
          } else if (key === 'cover_image_id') {
            cover_image_id = value;
          } else if (key === 'youtube_video_id') {
            youtube_video_id = value;
          }
        }
      });
    } else {
      description = fullContent.substring(0, 150) + (fullContent.length > 150 ? '...' : '');
    }
    
    return {
      title,
      description,
      content,
      published_at,
      tags,
      cover_image_id,
      youtube_video_id,
    };
  };

  const processUploads = async (inserts: NewPost[], updates: { existingId: string; newData: NewPost }[]) => {
    if (!user) {
      showError("You must be logged in to process uploads.");
      return;
    }
    const toastId = showLoading(`Processing import...`);
    try {
      const insertPromises = [];
      if (inserts.length > 0) {
        const insertsWithUserId = inserts.map(p => ({ ...p, user_id: user.id }));
        insertPromises.push(supabase.from("posts").insert(insertsWithUserId));
      }

      const updatePromises = updates.map(u =>
        supabase.from("posts").update({ ...u.newData, user_id: user.id }).eq('id', u.existingId)
      );

      const results = await Promise.all([...insertPromises, ...updatePromises]);

      for (const result of results) {
        if (result.error) {
          throw new Error(result.error.message);
        }
      }

      dismissToast(toastId);
      if (inserts.length > 0 || updates.length > 0) {
        showSuccess(`${inserts.length} new posts added, ${updates.length} posts updated.`);
      }
      fetchPosts();

    } catch (error: any) {
      dismissToast(toastId);
      showError(`Import failed: ${error.message}`);
    }
  };

  const handleConfirmAndProcessUploads = async () => {
    setIsUpdateDialogVisible(false);

    const updatesToPerform = postsToUpdate.filter(u => selectedUpdates.has(u.existingId));
    const skippedCount = postsToUpdate.length - updatesToPerform.length;

    await processUploads(postsToInsert, updatesToPerform);

    if (skippedCount > 0) {
      showError(`${skippedCount} potential updates were skipped.`);
    }

    setPostsToInsert([]);
    setPostsToUpdate([]);
    setSelectedUpdates(new Set());
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    if (!user) {
      showError("You must be logged in to import posts.");
      return;
    }

    setIsUploading(true);
    const toastId = showLoading(`Importing ${selectedFiles.length} file(s)...`);

    try {
      let allNewPosts: NewPost[] = [];
      for (const file of Array.from(selectedFiles)) {
        if (file.type === "text/xml" || file.name.endsWith(".xml")) {
          const content = await file.text();
          const posts = await parseWordPressXml(content);
          allNewPosts.push(...posts);
        } else if (file.type === "text/markdown" || file.name.endsWith(".md")) {
          const post = await parseMarkdownFile(file);
          allNewPosts.push(post);
        }
      }

      const existingPostsMap = new Map(posts.map(p => [p.title.toLowerCase(), p]));
      const newPostsToInsert: NewPost[] = [];
      const potentialUpdates: { existingId: string; existingTitle: string; newData: NewPost }[] = [];

      for (const newPost of allNewPosts) {
        const existingPost = existingPostsMap.get(newPost.title.toLowerCase());
        if (existingPost) {
          potentialUpdates.push({
            existingId: existingPost.id,
            existingTitle: existingPost.title,
            newData: newPost,
          });
        } else {
          newPostsToInsert.push(newPost);
        }
      }

      dismissToast(toastId);

      setPostsToInsert(newPostsToInsert);
      setPostsToUpdate(potentialUpdates);

      if (potentialUpdates.length > 0) {
        setSelectedUpdates(new Set());
        setIsUpdateDialogVisible(true);
      } else if (newPostsToInsert.length > 0) {
        await processUploads(newPostsToInsert, []);
      } else {
        showSuccess("No new posts to import.");
      }

    } catch (error: any) {
      dismissToast(toastId);
      showError(`Import failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      setSelectedFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBulkDownload = async () => {
    const toastId = showLoading(`Preparing ${selectedPosts.size} post(s) for download...`);
    try {
        const zip = new JSZip();
        const postsToDownload = posts.filter(post => selectedPosts.has(post.id));

        postsToDownload.forEach(post => {
            const tagsString = post.tags && post.tags.length > 0 ? `\ntags: "${post.tags.join(', ').replace(/"/g, '\\"')}"` : '';
            const coverImageIdString = post.cover_image_id ? `\ncover_image_id: "${post.cover_image_id}"` : '';
            const youtubeVideoIdString = post.youtube_video_id ? `\nyoutube_video_id: "${post.youtube_video_id}"` : '';

            const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
description: "${(post.description || '').replace(/"/g, '\\"')}"
published_at: ${post.published_at ? new Date(post.published_at).toISOString().split('T')[0] : ''}${tagsString}${coverImageIdString}${youtubeVideoIdString}
---

`;
            const markdownContent = frontmatter + (post.content || '');
            const fileName = sanitizeFileName(post.title).replace(/\.[^/.]+$/, "") + ".md";
            zip.file(fileName, markdownContent);
        });

        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = "blog_export.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        dismissToast(toastId);
        showSuccess(`${postsToDownload.length} post(s) downloaded.`);

    } catch (error: any) {
        dismissToast(toastId);
        showError(`Download failed: ${error.message}`);
    }
  };

  const handleSelectPost = (id: string) => {
    const newSelection = new Set(selectedPosts);
    newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
    setSelectedPosts(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedPosts(checked ? new Set(posts.map(p => p.id)) : new Set());
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Posts</CardTitle>
          <CardDescription>Upload WordPress XML export files or Markdown (.md) files to create new posts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input 
              type="file" 
              accept=".xml,.md,text/xml,text/markdown" 
              multiple
              onChange={handleFileChange} 
              ref={fileInputRef}
              className="flex-grow"
            />
            <Button onClick={handleUpload} disabled={!selectedFiles || isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Importing..." : "Import"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Post" : "Add New Post"}</CardTitle>
            <CardDescription>
              {editingId ? "Update the details for this blog post." : "Create a new article. You can use Markdown for the content."}
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
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A short summary of the post." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tags" render={({ field }) => (
                  <FormItem><FormLabel>Tags (comma-separated)</FormLabel><FormControl><Input placeholder="e.g., react, javascript, webdev" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
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
                  <Button type="submit">{editingId ? "Update Post" : "Add Post"}</Button>
                  {editingId && <Button variant="outline" onClick={cancelEdit}>Cancel</Button>}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Post List</CardTitle>
                <CardDescription>Your current list of blog posts.</CardDescription>
              </div>
              {selectedPosts.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleBulkDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download ({selectedPosts.size})
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete ({selectedPosts.size})</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete {selectedPosts.size} selected posts.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedPosts(new Set())}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center border-b pb-2 mb-2 space-x-3">
              <Checkbox id="select-all" onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={posts.length > 0 && selectedPosts.size === posts.length} disabled={posts.length === 0} />
              <label htmlFor="select-all" className="text-sm font-medium">Select All</label>
            </div>
            <div className="space-y-2 mt-4">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Checkbox id={`select-${post.id}`} checked={selectedPosts.has(post.id)} onCheckedChange={() => handleSelectPost(post.id)} />
                      <label htmlFor={`select-${post.id}`} className="font-medium truncate pr-2 cursor-pointer">{post.title}</label>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(post)}><Edit className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center pt-4">No posts yet. Add one using the form!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isUpdateDialogVisible} onOpenChange={setIsUpdateDialogVisible}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Updates</DialogTitle>
            <DialogDescription>
              The following posts already exist. Select the ones you want to update with the data from your file(s). Unselected posts will be skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2 p-1">
            {postsToUpdate.map(item => (
              <div key={item.existingId} className="flex items-center space-x-2 p-2 border rounded-md">
                <Checkbox
                  id={`update-${item.existingId}`}
                  onCheckedChange={(checked) => {
                    const newSelection = new Set(selectedUpdates);
                    if (checked) {
                      newSelection.add(item.existingId);
                    } else {
                      newSelection.delete(item.existingId);
                    }
                    setSelectedUpdates(newSelection);
                  }}
                />
                <label htmlFor={`update-${item.existingId}`} className="text-sm font-medium leading-none">
                  Update "{item.existingTitle}"
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogVisible(false)}>Cancel</Button>
            <Button onClick={handleConfirmAndProcessUploads}>
              Import ({postsToInsert.length}) & Update ({selectedUpdates.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageBlog;