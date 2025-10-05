import { useRef, useState } from "react";
import { PostList } from "../components/blog/PostList";
import { BulkImport } from "../components/blog/BulkImport";
import { UpdatePostsDialog } from "../components/blog/UpdatePostsDialog";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BlogForm } from "@/components/blog/BlogForm";
import { useBlogManagement } from "@/hooks/useBlogManagement";
import { parseWordPressXml } from "@/components/blog/BlogManagementUtils";

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
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !isUpdateDialogVisible && !editingPost,
  });

  const handleFileChange = (files: FileList | null) => {
    setSelectedFiles(files);
    if (files && files.length > 0) {
      const xmlFile = Array.from(files).find(f => f.type === "text/xml" || f.name.endsWith(".xml"));
      if (xmlFile) {
        processXmlFile(xmlFile);
      }
    }
  };

  const processXmlFile = async (file: File) => {
    try {
      const content = await file.text();
      const { categories } = await parseWordPressXml(content);
      if (categories.length > 0) {
        setCategories(categories);
        setShowCategoryDialog(true);
      } else {
        // If no categories found, proceed with normal upload
        handleUpload();
      }
    } catch (error) {
      console.error("Error processing XML file:", error);
      // Fall back to normal upload if there's an error
      handleUpload();
    }
  };

  const handleCategorySelection = (selected: string[]) => {
    setSelectedCategories(selected);
    setShowCategoryDialog(false);
    // Proceed with upload after category selection
    handleUpload();
  };

  return (
    <div className="space-y-8" ref={containerRef}>
      <BulkImport
        onFileChange={handleFileChange}
        onUpload={handleUpload}
        isUploading={isUploading}
        selectedFiles={selectedFiles}
        categories={categories}
        onCategorySelection={handleCategorySelection}
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