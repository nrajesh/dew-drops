import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Post, GalleryImage } from "@/types";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPosts,
  fetchGalleryImages,
  parseWordPressXml,
  parseMarkdownFile,
  processUploads,
  handleBulkDelete,
  handleBulkTagUpdate,
  handleBulkStatusChange,
  handleBulkDownload,
  extractDescriptionFromContent,
  ensureContentHasTripleBackticks
} from "@/components/blog/BlogManagementUtils";
import { PostFormData } from "@/components/blog/BlogForm";

type NewPost = Omit<Post, 'id' | 'created_at' | 'user_id'>;

export const useBlogManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [postsToInsert, setPostsToInsert] = useState<NewPost[]>([]);
  const [postsToUpdate, setPostsToUpdate] = useState<{ existingId: string; existingTitle: string; newData: NewPost }[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage, setPostsPerPage] = useState(10);

  const loadData = useCallback(async () => {
    const [fetchedPosts, fetchedGalleryImages] = await Promise.all([
      fetchPosts(),
      fetchGalleryImages()
    ]);

    setPosts(fetchedPosts);
    setGalleryImages(fetchedGalleryImages);

    const allTags = new Set<string>();
    fetchedPosts.forEach(post => {
      post.tags?.forEach(tag => allTags.add(tag));
    });
    setUniqueTags(Array.from(allTags).sort());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFormSubmit = useCallback(async (values: PostFormData) => {
    if (!user) {
      showError("You must be logged in to manage blog posts.");
      return;
    }

    const toastId = showLoading(editingPost ? "Updating post..." : "Adding new post...");

    let description = values.description;
    if (!description || description.trim() === '') {
      description = extractDescriptionFromContent(values.content);
    }

    const content = ensureContentHasTripleBackticks(values.content);

    const postData: NewPost = {
      title: values.title,
      description: description,
      content: content,
      published_at: values.published_at,
      published: values.published,
      tags: values.tags || [],
      cover_image_id: values.cover_image_id || null,
      youtube_video_id: values.youtube_video_id || null,
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
      loadData();
    }
  }, [user, editingPost, loadData]);

  useEffect(() => {
    if (location.state?.newPostData) {
      handleFormSubmit(location.state.newPostData);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, handleFormSubmit, navigate, location.pathname]);

  const handleUpload = useCallback(async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;

    setIsUploading(true);
    const toastId = showLoading(`Importing ${selectedFiles.length} file(s)...`);

    try {
      let allNewPosts: NewPost[] = [];
      for (const file of Array.from(selectedFiles)) {
        if (file.type === "text/xml" || file.name.endsWith(".xml")) {
          const content = await file.text();
          const parsedData = await parseWordPressXml(content);
          allNewPosts.push(...parsedData.posts.map(post => ({
            title: post.title,
            description: post.description,
            content: post.content,
            published_at: post.published_at,
            published: false, // Always import as draft
            tags: post.tags,
            cover_image_id: null,
            youtube_video_id: null,
          })));
        } else if (file.type === "text/markdown" || file.name.endsWith(".md")) {
          allNewPosts.push(await parseMarkdownFile(file));
        }
      }

      const uniqueNewPostsMap = new Map(allNewPosts.map(p => [p.title.toLowerCase(), p]));
      const existingPostsMap = new Map(posts.map(p => [p.title.toLowerCase(), p]));

      const newPostsToInsert: NewPost[] = [];
      const potentialUpdates: { existingId: string; existingTitle: string; newData: NewPost }[] = [];

      uniqueNewPostsMap.forEach((newPost, titleKey) => {
        const existingPost = existingPostsMap.get(titleKey);
        if (existingPost) {
          potentialUpdates.push({ existingId: existingPost.id, existingTitle: existingPost.title, newData: newPost });
        } else {
          newPostsToInsert.push(newPost);
        }
      });

      dismissToast(toastId);
      setPostsToInsert(newPostsToInsert);
      setPostsToUpdate(potentialUpdates);

      if (potentialUpdates.length > 0) {
        setSelectedUpdates(new Set());
        setIsUpdateDialogVisible(true);
      } else if (newPostsToInsert.length > 0) {
        if (await processUploads(user.id, newPostsToInsert, [])) {
          loadData();
        }
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
  }, [selectedFiles, user, posts, loadData]);

  const handleConfirmAndProcessUploads = useCallback(async () => {
    if (!user) return;
    setIsUpdateDialogVisible(false);

    const updatesToPerform = postsToUpdate.filter(u => selectedUpdates.has(u.existingId));
    const skippedCount = postsToUpdate.length - updatesToPerform.length;

    if (await processUploads(user.id, postsToInsert, updatesToPerform)) {
      if (skippedCount > 0) showError(`${skippedCount} potential updates were skipped.`);
      loadData();
    }

    setPostsToInsert([]);
    setPostsToUpdate([]);
    setSelectedUpdates(new Set());
  }, [user, postsToInsert, postsToUpdate, selectedUpdates, loadData]);

  const handleBulkDeleteWrapper = useCallback(async () => {
    if (await handleBulkDelete(selectedPosts)) {
      setSelectedPosts(new Set());
      loadData();
    }
  }, [selectedPosts, loadData]);

  const handleBulkTagUpdateWrapper = useCallback(async (tags: string[]) => {
    if (await handleBulkTagUpdate(selectedPosts, tags)) {
      setSelectedPosts(new Set());
      loadData();
    }
  }, [selectedPosts, loadData]);

  const handleBulkStatusChangeWrapper = useCallback(async (published: boolean) => {
    if (await handleBulkStatusChange(selectedPosts, published)) {
      setSelectedPosts(new Set());
      loadData();
    }
  }, [selectedPosts, loadData]);

  const handleBulkDownloadWrapper = useCallback(async () => {
    await handleBulkDownload(posts, selectedPosts);
  }, [posts, selectedPosts]);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return posts.slice(startIndex, startIndex + postsPerPage);
  }, [posts, currentPage, postsPerPage]);

  const totalPages = Math.ceil(posts.length / postsPerPage);

  const handleItemsPerPageChange = (value: number) => {
    setPostsPerPage(value);
    setCurrentPage(1);
  };

  const handleSelectPost = (id: string) => {
    const newSelection = new Set(selectedPosts);
    newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
    setSelectedPosts(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    const pageIds = new Set(paginatedPosts.map(p => p.id));
    if (checked) {
      setSelectedPosts(prev => new Set([...prev, ...pageIds]));
    } else {
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        pageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  return {
    posts,
    galleryImages,
    uniqueTags,
    editingPost,
    setEditingPost,
    selectedFiles,
    setSelectedFiles,
    isUploading,
    selectedPosts,
    isUpdateDialogVisible,
    setIsUpdateDialogVisible,
    postsToInsert,
    postsToUpdate,
    selectedUpdates,
    setSelectedUpdates,
    handleFormSubmit,
    handleUpload,
    handleConfirmAndProcessUploads,
    handleBulkDeleteWrapper,
    handleBulkTagUpdateWrapper,
    handleBulkStatusChangeWrapper,
    handleBulkDownloadWrapper,
    paginatedPosts,
    currentPage,
    totalPages,
    postsPerPage,
    setCurrentPage,
    handleItemsPerPageChange,
    handleSelectPost,
    handleSelectAll,
  };
};