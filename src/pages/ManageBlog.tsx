import { useRef } from "react";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { BlogFormDialog } from "@/components/blog/BlogFormDialog";
import { BulkActionsSection } from "@/components/blog/BulkActionsSection";
import { UpdatePostsDialog } from "@/components/blog/UpdatePostsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBlogManagement } from "@/hooks/useBlogManagement";
import { PostList } from "@/components/blog/PostList";

const ManageBlog = () => {
  const containerRef = useRef<HTMLDivElement>(null);

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
    handleFormSubmit,
    handleUpload,
    handleConfirmAndProcessUploads,
    handleBulkDelete,
    handleBulkTagUpdate,
    handleBulkDownload,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
  } = useBlogManagement();

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !editingPost && !isUpdateDialogVisible,
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
        onCreateNewPost={() => setEditingPost({} as any)} // Open dialog for new post
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
            onEdit={setEditingPost}
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
            onEdit={setEditingPost}
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

      <BlogFormDialog
        isOpen={editingPost !== null}
        onOpenChange={(isOpen) => !isOpen && setEditingPost(null)}
        editingPost={editingPost}
        galleryImages={galleryImages}
        uniqueTags={uniqueTags}
        onSubmit={handleFormSubmit}
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