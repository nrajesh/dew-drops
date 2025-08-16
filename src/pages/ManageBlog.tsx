import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Post, GalleryImage } from "@/types";
import { showSuccess, showError, showLoading, dismissToast, updateToastSuccess, updateToastError } from "@/utils/toast";
import TurndownService from "turndown";
import JSZip from 'jszip';
import { sanitizeFileName } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { BlogForm, PostFormData } from "../components/blog/BlogForm";
import { PostList } from "../components/blog/PostList";
import { BulkImport } from "../components/blog/BulkImport";
import { UpdatePostsDialog } from "../components/blog/UpdatePostsDialog";

type NewPost = Omit<Post, 'id' | 'created_at' | 'user_id'>;

const ManageBlog = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
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
      const allTags = new Set<string>();
      (data as Post[]).forEach(post => {
        post.tags?.forEach(tag => allTags.add(tag));
      });
      setUniqueTags(Array.from(allTags).sort());
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

  async function handleFormSubmit(values: PostFormData) {
    if (!user) {
      showError("You must be logged in to manage blog posts.");
      return;
    }

    const toastId = showLoading(editingPost ? "Updating post..." : "Adding new post...");
    
    const postData = { 
      ...values,
      user_id: user.id,
    };

    const { error } = editingPost
      ? await supabase.from("posts").update(postData).eq("id", editingPost.id)
      : await supabase.from("posts").insert(postData);

    dismissToast(toastId);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Post ${editingPost ? "updated" : "added"} successfully!`);
      setEditingPost(null);
      fetchPosts();
    }
  }

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
    setEditingPost(null);
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
      let contentHtml = item.getElementsByTagNameNS("*", "encoded")[0]?.textContent || "";
      
      contentHtml = contentHtml.replace(/<!--\s*(more|nextpage)\s*-->/gi, '');

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

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = fullContent.match(frontmatterRegex);

    if (match) {
      const frontmatterContent = match[1];
      content = match[2];

      frontmatterContent.split(/\r?\n/).forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const key = line.slice(0, colonIndex).trim();
          let value = line.slice(colonIndex + 1).trim();
          
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          switch (key) {
            case 'title':
              title = value;
              break;
            case 'description':
              description = value;
              break;
            case 'published_at':
            case 'date':
              const trimmedValue = value.trim();
              const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

              if (dateOnlyRegex.test(trimmedValue)) {
                // For date-only strings (YYYY-MM-DD), we must parse them as UTC
                // to prevent the browser's timezone from shifting the date.
                const parts = trimmedValue.split('-').map(p => parseInt(p, 10));
                // Month is 0-indexed in JavaScript's Date constructor.
                const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                published_at = utcDate.toISOString();
              } else {
                // For other formats (e.g., full ISO strings), attempt to parse directly.
                const parsedDate = new Date(trimmedValue);
                if (!isNaN(parsedDate.getTime())) {
                  published_at = parsedDate.toISOString();
                }
              }
              break;
            case 'tags':
              let rawTags = value;
              if (rawTags.startsWith('[') && rawTags.endsWith(']')) {
                rawTags = rawTags.slice(1, -1);
              }
              tags = rawTags.split(',').map(tag => tag.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
              break;
            case 'cover_image_id':
              cover_image_id = value;
              break;
            case 'youtube_video_id':
              youtube_video_id = value;
              break;
          }
        }
      });
    } else {
      description = fullContent.substring(0, 150) + (fullContent.length > 150 ? '...' : '');
    }
    
    content = content.trim().replace(/<!--\s*(more|nextpage)\s*-->/gi, '');

    return { title, description, content, published_at, tags, cover_image_id, youtube_video_id };
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
        if (result.error) throw new Error(result.error.message);
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

      // De-duplicate allNewPosts by title (case-insensitive), keeping the last one found.
      const uniqueNewPostsMap = new Map<string, NewPost>();
      for (const post of allNewPosts) {
        uniqueNewPostsMap.set(post.title.toLowerCase(), post);
      }
      const uniqueNewPosts = Array.from(uniqueNewPostsMap.values());

      const existingPostsMap = new Map(posts.map(p => [p.title.toLowerCase(), p]));
      const newPostsToInsert: NewPost[] = [];
      const potentialUpdates: { existingId: string; existingTitle: string; newData: NewPost }[] = [];

      for (const newPost of uniqueNewPosts) {
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

        updateToastSuccess(toastId, `${postsToDownload.length} post(s) downloaded.`);

    } catch (error: any) {
        updateToastError(toastId, `Download failed: ${error.message}`);
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

  const handleBulkTagUpdate = async (tags: string[]) => {
    const toastId = showLoading(`Updating tags for ${selectedPosts.size} posts...`);
    const { error } = await supabase
      .from("posts")
      .update({ tags })
      .in("id", Array.from(selectedPosts));
    
    dismissToast(toastId);
    if (error) {
      showError(`Failed to update tags: ${error.message}`);
    } else {
      showSuccess("Tags updated successfully.");
      fetchPosts();
      setSelectedPosts(new Set());
    }
  };

  return (
    <div className="space-y-8">
      <BulkImport 
        onFileChange={setSelectedFiles}
        onUpload={handleUpload}
        isUploading={isUploading}
        selectedFiles={selectedFiles}
      />
      <div className="grid gap-8 md:grid-cols-2">
        <BlogForm 
          editingPost={editingPost}
          galleryImages={galleryImages}
          uniqueTags={uniqueTags}
          onSubmit={handleFormSubmit}
          onCancel={cancelEdit}
        />
        <PostList 
          posts={posts}
          selectedPosts={selectedPosts}
          onSelectPost={handleSelectPost}
          onSelectAll={handleSelectAll}
          onEdit={setEditingPost}
          onDelete={handleBulkDelete}
          onDownload={handleBulkDownload}
          onBulkTagUpdate={handleBulkTagUpdate}
          uniqueTags={uniqueTags}
        />
      </div>
      <UpdatePostsDialog 
        isOpen={isUpdateDialogVisible}
        onOpenChange={setIsUpdateDialogVisible}
        postsToInsert={postsToInsert}
        postsToUpdate={postsToUpdate}
        selectedUpdates={selectedUpdates}
        onSelectedUpdatesChange={setSelectedUpdates}
        onConfirm={handleConfirmAndProcessUploads}
      />
    </div>
  );
};

export default ManageBlog;