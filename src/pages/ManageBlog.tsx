import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError, showLoading, dismissToast, updateToastSuccess, updateToastError } from "@/utils/toast";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { useBlogManagement } from "@/hooks/useBlogManagement"; // Import the refactored hook

type NewPost = Omit<Post, 'id' | 'created_at' | 'user_id'>;

const ManageBlog = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'published' | 'unpublished'>('published'); // New state for tabs
  const [searchTerm, setSearchTerm] = useState(""); // Global search term for all posts

  const {
    posts, // All posts from useManagement
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
    handleTogglePublish,

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
    handleFormSubmit: handleFormSubmitFromHook, // Renamed to avoid conflict
    handleUpload,
    handleConfirmAndProcessUploads,
    handleBulkDelete,
    handleBulkTagUpdate,
    handleBulkDownload,
  } = useBlogManagement();

  // Filter posts based on active tab for display in PostList
  const filteredPostsForTab = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filteredBySearch = posts.filter(post =>
      post.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      (post.description && post.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (post.content && post.content.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (post.tags && post.tags.some(tag => normalizeTag(tag).toLowerCase().includes(lowerCaseSearchTerm)))
    );

    return filteredBySearch.filter(post =>
      activeTab === 'published' ? post.published : !post.published
    );
  }, [posts, searchTerm, activeTab]);

  const totalPagesForTab = Math.ceil(filteredPostsForTab.length / itemsPerPage);
  const paginatedPostsForTab = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPostsForTab.slice(startIndex, endIndex);
  }, [filteredPostsForTab, currentPage, itemsPerPage]);

  usePaginationNavigation({
    currentPage,
    totalPages: totalPagesForTab,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !editingPost && !isUpdateDialogVisible,
  });

  // Adjust selectedPosts when switching tabs to only include items relevant to the new tab
  useEffect(() => {
    setSelectedPosts(new Set());
    setCurrentPage(1); // Reset page when tab changes
  }, [activeTab, setSelectedPosts, setCurrentPage]);


  return (
    <div className="space-y-8" ref={containerRef}>
      <BulkActionsSection
        uploadFiles={selectedFiles ? Array.from(selectedFiles) : []}
        onFileUpload={(e) => setSelectedFiles(e.target.files)}
        onProcessUploads={handleUpload}
        selectedPosts={selectedPosts}
        onBulkTagUpdate={handleBulkTagUpdate}
        onBulkDownload={handleBulkDownload}
        onDeleteSelected={handleBulkDelete}
        uniqueTags={uniqueTags}
        onCreateNewPost={() => {
          setEditingPost(null);
          // Ensure form dialog is opened
          // This is handled by the useEffect in useBlogManagement
        }}
        searchTerm={searchTerm} // Pass searchTerm
        onSearch={setSearchTerm} // Pass setSearchTerm as onSearch
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'published' | 'unpublished')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="published">Published Posts ({posts.filter(p => p.published).length})</TabsTrigger>
          <TabsTrigger value="unpublished">Unpublished Posts ({posts.filter(p => !p.published).length})</TabsTrigger>
        </TabsList>
        <TabsContent value="published">
          <PostList
            posts={paginatedPostsForTab}
            selectedPosts={selectedPosts}
            onSelectPost={handleSelectPost}
            onSelectAll={handleSelectAll}
            onEdit={(post) => setEditingPost(post)}
            onDelete={handleBulkDelete}
            onDownload={handleBulkDownload}
            onBulkTagUpdate={handleBulkTagUpdate}
            onTogglePublish={handleTogglePublish}
            uniqueTags={uniqueTags}
            currentPage={currentPage}
            totalPages={totalPagesForTab}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={filteredPostsForTab.length}
            isLoading={isLoading}
            // searchTerm={""} // Removed
            // onSearch={() => {}} // Removed
          />
        </TabsContent>
        <TabsContent value="unpublished">
          <PostList
            posts={paginatedPostsForTab}
            selectedPosts={selectedPosts}
            onSelectPost={handleSelectPost}
            onSelectAll={handleSelectAll}
            onEdit={(post) => setEditingPost(post)}
            onDelete={handleBulkDelete}
            onDownload={handleBulkDownload}
            onBulkTagUpdate={handleBulkTagUpdate}
            onTogglePublish={handleTogglePublish}
            uniqueTags={uniqueTags}
            currentPage={currentPage}
            totalPages={totalPagesForTab}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={filteredPostsForTab.length}
            isLoading={isLoading}
            // searchTerm={""} // Removed
            // onSearch={() => {}} // Removed
          />
        </TabsContent>
      </Tabs>

      <BlogFormDialog
        isOpen={!!editingPost} // Dialog is open if editingPost is not null
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingPost(null);
          }
        }}
        editingPost={editingPost}
        galleryImages={galleryImages}
        uniqueTags={uniqueTags}
        onSubmit={handleFormSubmitFromHook} // Use the renamed handler
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