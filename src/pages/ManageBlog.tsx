import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError, showLoading, dismissToast, updateToastSuccess, updateToastError } from "@/utils/toast"; // Import updateToastSuccess and updateToastError
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
import { BlogFormDialog, BlogFormValues } from "@/components/blog/BlogFormDialog";
import { BulkActionsSection } from "@/components/blog/BulkActionsSection";
import { normalizeTag } from "@/lib/utils";
import { UpdatePostsDialog } from "@/components/blog/UpdatePostsDialog";

type NewPost = Omit<Post, 'id' | 'created_at' | 'user_id'>;

const ManageBlog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [postsToInsert, setPostsToInsert] = useState<NewPost[]>([]);
  const [postsToUpdate, setPostsToUpdate] = useState<{ existingId: string; existingTitle: string; newData: NewPost }[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

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
      setIsFormDialogOpen(true);
    }
  }, [editingPost]);

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
    enabled: !isFormDialogOpen && !isUpdateDialogVisible,
  });

  const uniqueTags = useMemo(() => {
    const allTags = posts.flatMap(post => post.tags || []);
    return Array.from(new Set(allTags.map(normalizeTag))).sort();
  }, [posts]);

  const handleAddOrUpdatePost = useCallback(async (values: BlogFormValues) => {
    const toastId = showLoading(editingPost ? "Updating post..." : "Adding post...");
    try {
      const postData = {
        title: values.title,
        description: values.description || extractDescriptionFromContent(values.content),
        content: ensureContentHasTripleBackticks(values.content),
        published_at: values.published_at?.toISOString() || null,
        published: values.published,
        tags: values.tags && values.tags.length > 0 ? values.tags.map(normalizeTag) : null,
        cover_image_id: values.cover_image_id === "--none--" ? null : values.cover_image_id,
        youtube_video_id: values.youtube_video_id === "" ? null : values.youtube_video_id,
      };

      if (editingPost) {
        const { error } = await supabase.from("posts").update(postData).eq("id", editingPost.id);
        if (error) throw error;
        updateToastSuccess(toastId, "Post updated successfully!"); // Changed to updateToastSuccess
      } else {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("User not authenticated.");
        const { error } = await supabase.from("posts").insert({ ...postData, user_id: user.id });
        if (error) throw error;
        updateToastSuccess(toastId, "Post added successfully!"); // Changed to updateToastSuccess
      }
      setIsFormDialogOpen(false);
      setEditingPost(null);
      fetchAllData();
    } catch (error: any) {
      updateToastError(toastId, `Operation failed: ${error.message}`); // Changed to updateToastError
    } finally {
      // dismissToast(toastId); // No longer needed here as updateToastSuccess/Error dismisses it
    }
  }, [editingPost, fetchAllData]);

  const handleSelectPost = useCallback((id: string) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allPostIds = new Set(paginatedPosts.map(post => post.id));
      setSelectedPosts(allPostIds);
    } else {
      setSelectedPosts(new Set());
    }
  }, [paginatedPosts]);

  const handleDeleteSelected = useCallback(async () => {
    const success = await handleBulkDelete(Array.from(selectedPosts), posts);
    if (success) {
      setSelectedPosts(new Set());
      fetchAllData();
    }
  }, [selectedPosts, posts, fetchAllData]);

  const handleBulkTagUpdateWrapper = useCallback(async (tags: string[]) => {
    const success = await handleBulkTagUpdate(selectedPosts, tags);
    if (success) {
      setSelectedPosts(new Set());
      fetchAllData();
    }
  }, [selectedPosts, fetchAllData]);

  const handleBulkStatusChangeWrapper = useCallback(async (published: boolean) => {
    const success = await handleBulkStatusChange(selectedPosts, published);
    if (success) {
      setSelectedPosts(new Set());
      fetchAllData();
    }
  }, [selectedPosts, fetchAllData]);

  const handleBulkDownloadWrapper = useCallback(async () => {
    await handleBulkDownload(selectedPosts, posts);
    setSelectedPosts(new Set());
  }, [selectedPosts, posts]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setUploadFiles(Array.from(event.target.files));
    }
  }, []);

  const handleProcessUploads = useCallback(async () => {
    if (uploadFiles.length === 0) {
      showError("No files selected for upload.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      showError("User not authenticated.");
      return;
    }

    const inserts: NewPost[] = [];
    const updates: { existingId: string; existingTitle: string; newData: NewPost }[] = [];

    const existingPostTitles = new Set(posts.map(p => p.title));

    for (const file of uploadFiles) {
      if (file.type === "text/xml" || file.name.endsWith(".xml")) {
        const xmlString = await file.text();
        const parsedPosts = await parseWordPressXml(xmlString);
        parsedPosts.forEach(newPost => {
          if (existingPostTitles.has(newPost.title)) {
            const existingPost = posts.find(p => p.title === newPost.title);
            if (existingPost) {
              updates.push({ existingId: existingPost.id, existingTitle: existingPost.title, newData: newPost });
            }
          } else {
            inserts.push(newPost);
          }
        });
      } else if (file.type === "text/markdown" || file.name.endsWith(".md")) {
        const parsedPost = await parseMarkdownFile(file);
        if (existingPostTitles.has(parsedPost.title)) {
          const existingPost = posts.find(p => p.title === parsedPost.title);
            if (existingPost) {
              updates.push({ existingId: existingPost.id, existingTitle: existingPost.title, newData: parsedPost });
            }
          } else {
            inserts.push(parsedPost);
          }
        } else {
          showError(`Unsupported file type: ${file.name}`);
        }
      }

    setUploadFiles([]);
    
    setPostsToInsert(inserts);
    setPostsToUpdate(updates);

    if (updates.length > 0) {
      setSelectedUpdates(new Set());
      setIsUpdateDialogVisible(true);
    } else if (inserts.length > 0) {
      const success = await processUploads(user.id, inserts, []);
      if (success) {
        fetchAllData();
      }
    } else {
      showSuccess("No new posts to import.");
    }
  }, [uploadFiles, posts, fetchAllData]);

  const handleConfirmAndProcessUploads = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      showError("User not authenticated.");
      return;
    }

    setIsUpdateDialogVisible(false);

    const updatesToPerform = postsToUpdate.filter(u => selectedUpdates.has(u.existingId));
    const skippedCount = postsToUpdate.length - updatesToPerform.length;

    const success = await processUploads(user.id, postsToInsert, updatesToPerform);

    if (success) {
      if (skippedCount > 0) showError(`${skippedCount} potential updates were skipped.`);
      fetchAllData();
    }
    
    setPostsToInsert([]);
    setPostsToUpdate([]);
    setSelectedUpdates(new Set());
  }, [postsToInsert, postsToUpdate, selectedUpdates, fetchAllData]);

  return (
    <div className="space-y-8" ref={containerRef}>
      <BulkActionsSection
        uploadFiles={uploadFiles}
        onFileUpload={handleFileUpload}
        onProcessUploads={handleProcessUploads}
        selectedPosts={selectedPosts}
        onBulkTagUpdate={handleBulkTagUpdateWrapper}
        onBulkStatusChange={handleBulkStatusChangeWrapper}
        onBulkDownload={handleBulkDownloadWrapper}
        onDeleteSelected={handleDeleteSelected}
        uniqueTags={uniqueTags}
        onCreateNewPost={() => {
          setEditingPost(null);
          setIsFormDialogOpen(true);
        }}
      />

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

      <BlogFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={(isOpen) => {
          setIsFormDialogOpen(isOpen);
          if (!isOpen) {
            setEditingPost(null);
          }
        }}
        editingPost={editingPost}
        galleryImages={galleryImages}
        uniqueTags={uniqueTags}
        onSubmit={handleAddOrUpdatePost}
      />

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