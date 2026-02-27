import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { BulkActionsSection } from "@/components/blog/BulkActionsSection";
import { UpdatePostsDialog } from "@/components/blog/UpdatePostsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBlogManagement } from "@/hooks/useBlogManagement";
import { PostList } from "@/components/blog/PostList";
import type { Post } from "@/types";

const ManageBlog = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    posts,
    paginatedPosts,
    isLoading,
    selectedPosts,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    setCurrentPage,
    setItemsPerPage,
    handleSelectPost,
    handleSelectAll,
    handleTogglePublish,
    uniqueTags,
    selectedFiles,
    setSelectedFiles,
    isUpdateDialogVisible,
    setIsUpdateDialogVisible,
    postsToInsert,
    postsToUpdate,
    selectedUpdates,
    setSelectedUpdates,
    handleConfirmAndProcessUploads,
    handleBulkDelete,
    handleBulkTagUpdate,
    handleBulkDownload,
    handleUpload,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
  } = useBlogManagement();

  const handleEditPost = (post: Post) => {
    navigate(`/manage-blog/edit/${post.id}`);
  };

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !isUpdateDialogVisible,
  });

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
        onCreateNewPost={() => navigate("/manage-blog/new")}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'published' | 'unpublished')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="published">Published ({posts.filter(p => p.published).length})</TabsTrigger>
          <TabsTrigger value="unpublished">Unpublished ({posts.filter(p => !p.published).length})</TabsTrigger>
        </TabsList>
        <TabsContent value="published">
          <PostList
            posts={paginatedPosts}
            selectedPosts={selectedPosts}
            onSelectPost={handleSelectPost}
            onSelectAll={handleSelectAll}
            onEdit={handleEditPost}
            onDelete={handleBulkDelete}
            onDownload={handleBulkDownload}
            onBulkTagUpdate={handleBulkTagUpdate}
            onTogglePublish={handleTogglePublish}
            uniqueTags={uniqueTags}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={totalItems}
            isLoading={isLoading}
          />
        </TabsContent>
        <TabsContent value="unpublished">
          <PostList
            posts={paginatedPosts}
            selectedPosts={selectedPosts}
            onSelectPost={handleSelectPost}
            onSelectAll={handleSelectAll}
            onEdit={handleEditPost}
            onDelete={handleBulkDelete}
            onDownload={handleBulkDownload}
            onBulkTagUpdate={handleBulkTagUpdate}
            onTogglePublish={handleTogglePublish}
            uniqueTags={uniqueTags}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={totalItems}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

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