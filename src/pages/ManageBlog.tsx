import { useRef } from "react";
import { PostList } from "../components/blog/PostList";
import { BulkImport } from "../components/blog/BulkImport";
import { UpdatePostsDialog } from "../components/blog/UpdatePostsDialog";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BlogForm } from "@/components/blog/BlogForm";
import { useBlogManagement } from "@/hooks/useBlogManagement";

const ManageBlog = () => {
  const {
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
  } = useBlogManagement();

  const containerRef = useRef<HTMLDivElement>(null);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !isUpdateDialogVisible && !editingPost,
  });

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