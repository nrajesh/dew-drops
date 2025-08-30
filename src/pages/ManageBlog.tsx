import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Post, GalleryImage } from "@/types";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { BlogForm, PostFormData } from "../components/blog/BlogForm";
import { PostList } from "../components/blog/PostList";
import { BulkImport } from "../components/blog/BulkImport";
import { UpdatePostsDialog } from "../components/blog/UpdatePostsDialog";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage, setPostsPerPage] = useState(10);

  // State for the update confirmation dialog
  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [postsToInsert, setPostsToInsert] = useState<NewPost[]>([]);
  const [postsToUpdate, setPostsToUpdate] = useState<{ existingId: string; existingTitle: string; newData: NewPost }[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      const [fetchedPosts, fetchedGalleryImages] = await Promise.all([
        fetchPosts(),
        fetchGalleryImages()
      ]);

      setPosts(fetchedPosts);
      setGalleryImages(fetchedGalleryImages);

      // Extract unique tags
      const allTags = new Set<string>();
      fetchedPosts.forEach(post => {
        post.tags?.forEach(tag => allTags.add(tag));
      });
      setUniqueTags(Array.from(allTags).sort());
    };

    loadData();
  }, []);

  // Handle new post creation from the layout
  useEffect(() => {
    if (location.state?.newPostData) {
      handleFormSubmit(location.state.newPostData);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Pagination
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return posts.slice(startIndex, startIndex + postsPerPage);
  }, [posts, currentPage, postsPerPage]);

  const totalPages = Math.ceil(posts.length / postsPerPage);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !isUpdateDialogVisible,
  });

  const handleItemsPerPageChange = (value: number) => {
    setPostsPerPage(value);
    setCurrentPage(1);
  };

  // Form handling
  async function handleFormSubmit(values: PostFormData) {
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
      const updatedPosts = await fetchPosts();
      setPosts(updatedPosts);
    }
  }

  const cancelEdit = () => {
    setEditingPost(null);
  };

  // Bulk operations
  const handleBulkDeleteWrapper = async () => {
    const success = await handleBulkDelete(selectedPosts);
    if (success) {
      setSelectedPosts(new Set());
      const updatedPosts = await fetchPosts();
      setPosts(updatedPosts);
    }
  };

  const handleBulkTagUpdateWrapper = async (tags: string[]) => {
    const success = await handleBulkTagUpdate(selectedPosts, tags);
    if (success) {
      setSelectedPosts(new Set());
      const updatedPosts = await fetchPosts();
      setPosts(updatedPosts);
    }
  };

  const handleBulkStatusChangeWrapper = async (published: boolean) => {
    const success = await handleBulkStatusChange(selectedPosts, published);
    if (success) {
      setSelectedPosts(new Set());
      const updatedPosts = await fetchPosts();
      setPosts(updatedPosts);
    }
  };

  const handleBulkDownloadWrapper = async () => {
    await handleBulkDownload(posts, selectedPosts);
  };

  // File parsing and processing
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
        const success = await processUploads(user.id, newPostsToInsert, []);
        if (success) {
          const updatedPosts = await fetchPosts();
          setPosts(updatedPosts);
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
  };

  const handleConfirmAndProcessUploads = async () => {
    if (!user) {
      showError("You must be logged in to process uploads.");
      return;
    }

    setIsUpdateDialogVisible(false);

    const updatesToPerform = postsToUpdate.filter(u => selectedUpdates.has(u.existingId));
    const skippedCount = postsToUpdate.length - updatesToPerform.length;

    const success = await processUploads(user.id, postsToInsert, updatesToPerform);

    if (success) {
      if (skippedCount > 0) {
        showError(`${skippedCount} potential updates were skipped.`);
      }
      const updatedPosts = await fetchPosts();
      setPosts(updatedPosts);
    }

    setPostsToInsert([]);
    setPostsToUpdate([]);
    setSelectedUpdates(new Set());
  };

  // Selection handling
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

  return (
    <div className="space-y-8" ref={containerRef}>
      <BulkImport
        onFileChange={setSelectedFiles}
        onUpload={handleUpload}
        isUploading={isUploading}
        selectedFiles={selectedFiles}
      />
      <div className="w-full">
        <PostList
          posts={paginatedPosts}
          selectedPosts={selectedPosts}
          onSelectPost={handleSelectPost}
          onSelectAll={handleSelectAll}
          onEdit={setEditingPost}
          onDelete={handleBulkDeleteWrapper}
          onDownload={handleBulkDownloadWrapper}
          onBulkTagUpdate={handleBulkTagUpdateWrapper}
          onBulkStatusChange={handleBulkStatusChangeWrapper}
          uniqueTags={uniqueTags}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={postsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          totalItems={posts.length}
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
      <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Make changes to your post here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <BlogForm
            editingPost={editingPost}
            galleryImages={galleryImages}
            uniqueTags={uniqueTags}
            onSubmit={handleFormSubmit}
            onCancel={() => setEditingPost(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageBlog;