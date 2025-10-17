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
import { useManagement } from "./useManagement"; // Import the generic hook

type NewPost = Omit<Post, 'id' | 'created_at' | 'user_id'>;

export const useBlogManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [postsToInsert, setPostsToInsert] = useState<NewPost[]>([]);
  const [postsToUpdate, setPostsToUpdate] = useState<{ existingId: string; existingTitle: string; newData: NewPost }[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  // Use the generic useManagement hook
  const {
    allItems: posts,
    paginatedItems: paginatedPosts, // Alias paginatedItems to paginatedPosts
    isLoading,
    selectedItems: selectedPosts, // Alias selectedItems to selectedPosts
    setSelectedItems: setSelectedPosts, // Alias setSelectedItems to setSelectedPosts
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    loadItems: loadPosts,
    handlePageChange: setCurrentPage,
    handleItemsPerPageChange: setItemsPerPage,
    handleSelectItem: handleSelectPost,
    handleSelectAllOnPage: handleSelectAll,
    handleBulkDelete: genericHandleBulkDelete,
    handleBulkStatusChange: genericHandleBulkStatusChange,
    handleBulkTagUpdate: genericHandleBulkTagUpdate,
    handleBulkDownload: genericHandleBulkDownload,
    handleToggleStatus: handleTogglePublish,
    allOnPageSelected,
  } = useManagement<Post>({
    fetchData: fetchPosts,
    deleteItems: handleBulkDelete,
    updateItemStatus: handleBulkStatusChange,
    updateItemTags: handleBulkTagUpdate,
    downloadItems: handleBulkDownload,
    idKey: 'id',
    statusKey: 'published',
  });

  useEffect(() => {
    const fetchInitialGalleryImages = async () => {
      const fetchedGalleryImages = await fetchGalleryImages();
      setGalleryImages(fetchedGalleryImages);
    };
    fetchInitialGalleryImages();
  }, []);

  const uniqueTags = useMemo(() => {
    const allTags = posts.flatMap(post => post.tags || []);
    return Array.from(new Set(allTags)).sort();
  }, [posts]);

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

    const postData = {
      ...values,
      description: description,
      content: content,
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
      loadPosts(); // Refresh posts after add/update
    }
  }, [user, editingPost, loadPosts]);

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
          allNewPosts.push(...await parseWordPressXml(content));
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
          loadPosts();
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
  }, [selectedFiles, user, posts, loadPosts]);

  const handleConfirmAndProcessUploads = useCallback(async () => {
    if (!user) return;
    setIsUpdateDialogVisible(false);

    const updatesToPerform = postsToUpdate.filter(u => selectedUpdates.has(u.existingId));
    const skippedCount = postsToUpdate.length - updatesToPerform.length;

    if (await processUploads(user.id, postsToInsert, updatesToPerform)) {
      if (skippedCount > 0) showError(`${skippedCount} potential updates were skipped.`);
      loadPosts();
    }

    setPostsToInsert([]);
    setPostsToUpdate([]);
    setSelectedUpdates(new Set());
  }, [user, postsToInsert, postsToUpdate, selectedUpdates, loadPosts]);

  return {
    posts, // All posts (from useManagement)
    paginatedPosts,
    isLoading,
    selectedPosts,
    setSelectedPosts,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    loadPosts,
    setCurrentPage,
    setItemsPerPage,
    handleSelectPost,
    handleSelectAll,
    allOnPageSelected,
    handleTogglePublish, // Individual publish toggle

    galleryImages,
    uniqueTags,
    editingPost,
    setEditingPost,
    selectedFiles,
    setSelectedFiles,
    isUploading,
    isUpdateDialogVisible,
    setIsUpdateDialogVisible,
    postsToInsert,
    postsToUpdate,
    selectedUpdates,
    setSelectedUpdates,
    handleFormSubmit,
    handleUpload,
    handleConfirmAndProcessUploads,
    
    // Expose generic bulk handlers directly
    handleBulkDelete: useCallback(() => genericHandleBulkDelete(selectedPosts, setSelectedPosts, posts), [genericHandleBulkDelete, selectedPosts, setSelectedPosts, posts]),
    handleBulkTagUpdate: useCallback((tags: string[]) => genericHandleBulkTagUpdate(selectedPosts, setSelectedPosts, tags), [genericHandleBulkTagUpdate, selectedPosts, setSelectedPosts]),
    handleBulkDownload: useCallback(() => genericHandleBulkDownload(selectedPosts, setSelectedPosts, posts), [genericHandleBulkDownload, selectedPosts, setSelectedPosts, posts]),
  };
};