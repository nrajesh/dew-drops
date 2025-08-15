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
import type { Post } from "@/types";
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
import TurndownService from "turndown";
import JSZip from 'jszip';
import { sanitizeFileName } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

const postSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  content: z.string().min(20, { message: "Content must be at least 20 characters." }),
  published_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format." }),
});

type NewPost = Omit<Post, 'id' | 'created_at' | 'user_id'>;

const ManageBlog = () => {
  const { user } = useAuth(); // Get the current user
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const turndownService = new TurndownService();

  useEffect(() => {
    fetchPosts();
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

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      published_at: new Date().toISOString().split("T")[0],
    },
  });

  async function onSubmit(values: z.infer<typeof postSchema>) {
    if (!user) {
      showError("You must be logged in to manage blog posts.");
      return;
    }

    const toastId = showLoading(editingId ? "Updating post..." : "Adding new post...");
    
    const postData = { 
      ...values,
      user_id: user.id, // Set the user_id here
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

      if (title && content) {
        newPosts.push({
          title,
          description,
          content,
          published_at: new Date(pubDate).toISOString(),
        });
      }
    });
    return newPosts;
  };

  const parseMarkdownFile = async (file: File): Promise<NewPost> => {
    const fullContent = await file.text();
    let title = file.name.replace(/\.md$/, ''); // Default title from filename, preserving case
    let description = '';
    let published_at = new Date().toISOString();
    let content = fullContent;

    // Regex to find YAML frontmatter at the beginning of the file
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = fullContent.match(frontmatterRegex);

    if (match) {
      const frontmatterContent = match[1];
      content = match[2].trim(); // Content is everything after the second '---'

      // Parse frontmatter lines
      frontmatterContent.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          // Remove quotes and unescape inner quotes
          const value = parts.slice(1).join(':').trim().replace(/^"|"$/g, '').replace(/\\"/g, '"'); 
          if (key === 'title') {
            title = value;
          } else if (key === 'description') {
            description = value;
          } else if (key === 'published_at') {
            published_at = value;
          }
        }
      });
    } else {
      // If no frontmatter, derive description from content
      description = fullContent.substring(0, 150) + (fullContent.length > 150 ? '...' : '');
    }
    
    return {
      title,
      description,
      content,
      published_at,
    };
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

      const existingTitles = new Set(posts.map(p => p.title)); // Check against original case
      const uniqueNewPosts = allNewPosts.filter(p => !existingTitles.has(p.title)); // Use original case for comparison
      const skippedCount = allNewPosts.length - uniqueNewPosts.length;

      if (uniqueNewPosts.length > 0) {
        const postsWithUserId = uniqueNewPosts.map(post => ({ ...post, user_id: user.id }));
        const { error } = await supabase.from("posts").insert(postsWithUserId);
        if (error) throw error;
      }

      dismissToast(toastId);
      let successMessage = `${uniqueNewPosts.length} new post(s) imported successfully.`;
      if (skippedCount > 0) {
        successMessage += ` ${skippedCount} duplicate(s) were skipped.`;
      }
      showSuccess(successMessage);
      fetchPosts();

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
            const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
description: "${(post.description || '').replace(/"/g, '\\"')}"
published_at: ${post.published_at ? new Date(post.published_at).toISOString().split('T')[0] : ''}
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
    </div>
  );
};

export default ManageBlog;