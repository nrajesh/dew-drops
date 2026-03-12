import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Post, GalleryImage } from "@/types";
import {
  showSuccess,
  showError,
  showLoading,
  dismissToast,
} from "@/utils/toast";
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
} from "@/components/blog/BlogManagementUtils";
import { PostFormData } from "@/components/blog/BlogForm";
import { usePagination } from "./usePagination";
import { normalizeTag } from "@/lib/utils";

type NewPost = Omit<Post, "id" | "created_at" | "user_id">;

export const useBlogManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [postsToInsert, setPostsToInsert] = useState<NewPost[]>([]);
  const [postsToUpdate, setPostsToUpdate] = useState<
    { existingId: string; existingTitle: string; newData: NewPost }[]
  >([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(
    new Set(),
  );

  const [activeTab, setActiveTab] = useState<"published" | "unpublished">(
    "published",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    const [postsData, imagesData] = await Promise.all([
      fetchPosts(),
      fetchGalleryImages(),
    ]);
    setAllPosts(postsData);
    setGalleryImages(imagesData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const uniqueTags = useMemo(() => {
    const allTags = allPosts.flatMap((post) => post.tags || []);
    return Array.from(new Set(allTags)).sort();
  }, [allPosts]);

  const filteredPosts = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const searched = allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        (post.description &&
          post.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (post.content &&
          post.content.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (post.tags &&
          post.tags.some((tag) =>
            normalizeTag(tag).toLowerCase().includes(lowerCaseSearchTerm),
          )),
    );
    return searched.filter((post) =>
      activeTab === "published" ? post.published : !post.published,
    );
  }, [allPosts, searchTerm, activeTab]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems: paginatedPosts,
  } = usePagination(filteredPosts, itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedPosts(new Set());
  }, [activeTab, searchTerm, itemsPerPage, setCurrentPage]);

  const handleSelectPost = useCallback((id: string) => {
    setSelectedPosts((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }, []);

  const allOnPageSelected = useMemo(
    () =>
      paginatedPosts.length > 0 &&
      paginatedPosts.every((p) => selectedPosts.has(p.id)),
    [paginatedPosts, selectedPosts],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const pageIds = new Set(paginatedPosts.map((p) => p.id));
      setSelectedPosts((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          pageIds.forEach((id) => newSet.add(id));
        } else {
          pageIds.forEach((id) => newSet.delete(id));
        }
        return newSet;
      });
    },
    [paginatedPosts],
  );

  const handleTogglePublish = useCallback(
    async (post: Post, published: boolean) => {
      if (!user) {
        showError("You must be logged in.");
        return;
      }
      if (await handleBulkStatusChange(new Set([post.id]), published)) {
        // Local update for immediate feedback
        setAllPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, published } : p)),
        );
      }
    },
    [user],
  );

  const handleFormSubmit = useCallback(
    async (values: PostFormData) => {
      if (!user) {
        showError("You must be logged in.");
        return;
      }
      const toastId = showLoading(
        editingPost ? "Updating post locally..." : "Adding new post locally...",
      );

      const postData = { ...values, user_id: user.id };

      // Local state update
      if (editingPost) {
        setAllPosts((prev) =>
          prev.map((p) =>
            p.id === editingPost.id ? { ...p, ...postData } : p,
          ),
        );
      } else {
        const newPost: Post = {
          ...postData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        } as Post;
        setAllPosts((prev) => [newPost, ...prev]);
      }

      dismissToast(toastId);
      showSuccess(
        `Post ${editingPost ? "updated" : "added"} successfully in this session! Note: Changes are not saved to JSON source.`,
      );
      setEditingPost(null);
    },
    [user, editingPost],
  );

  useEffect(() => {
    if (location.state?.newPostData) {
      handleFormSubmit(location.state.newPostData);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, handleFormSubmit, navigate, location.pathname]);

  const handleUpload = useCallback(async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;
    setIsUploading(true);
    const toastId = showLoading(
      `Importing ${selectedFiles.length} file(s) locally...`,
    );
    try {
      const allNewPosts: NewPost[] = [];
      for (const file of Array.from(selectedFiles)) {
        if (file.type === "text/xml" || file.name.endsWith(".xml")) {
          allNewPosts.push(...(await parseWordPressXml(await file.text())));
        } else if (file.type === "text/markdown" || file.name.endsWith(".md")) {
          allNewPosts.push(await parseMarkdownFile(file));
        }
      }
      const uniqueNewPostsMap = new Map(
        allNewPosts.map((p) => [p.title.toLowerCase(), p]),
      );
      const existingPostsMap = new Map(
        allPosts.map((p) => [p.title.toLowerCase(), p]),
      );
      const newPostsToInsert: NewPost[] = [];
      const potentialUpdates: {
        existingId: string;
        existingTitle: string;
        newData: NewPost;
      }[] = [];
      uniqueNewPostsMap.forEach((newPost, titleKey) => {
        const existingPost = existingPostsMap.get(titleKey);
        if (existingPost) {
          potentialUpdates.push({
            existingId: existingPost.id,
            existingTitle: existingPost.title,
            newData: newPost,
          });
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
          const newPosts = newPostsToInsert.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            user_id: user.id,
          })) as Post[];
          setAllPosts((prev) => [...newPosts, ...prev]);
        }
      } else {
        showSuccess("No new posts to import.");
      }
    } catch (error: unknown) {
      const err = error as Error;
      dismissToast(toastId);
      showError(`Import failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      setSelectedFiles(null);
    }
  }, [selectedFiles, user, allPosts]);

  const handleConfirmAndProcessUploads = useCallback(async () => {
    if (!user) return;
    setIsUpdateDialogVisible(false);
    const updatesToPerform = postsToUpdate.filter((u) =>
      selectedUpdates.has(u.existingId),
    );
    const skippedCount = postsToUpdate.length - updatesToPerform.length;
    if (await processUploads(user.id, postsToInsert, updatesToPerform)) {
      if (skippedCount > 0)
        showError(`${skippedCount} potential updates were skipped.`);

      // Local state update
      const newPosts = postsToInsert.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        user_id: user.id,
      })) as Post[];

      const updatedPosts = allPosts.map((p) => {
        const update = updatesToPerform.find((u) => u.existingId === p.id);
        return update ? { ...p, ...update.newData } : p;
      });

      setAllPosts([...newPosts, ...updatedPosts]);
    }
    setPostsToInsert([]);
    setPostsToUpdate([]);
    setSelectedUpdates(new Set());
  }, [user, postsToInsert, postsToUpdate, selectedUpdates, allPosts]);

  const createBulkAction =
    <T extends unknown[]>(
      action: (posts: Set<string>, ...args: T) => Promise<boolean>,
    ) =>
    async (...args: T) => {
      if (await action(selectedPosts, ...args)) {
        // Local state updates for bulk actions
        if (action.name.includes("Delete")) {
          setAllPosts((prev) => prev.filter((p) => !selectedPosts.has(p.id)));
        } else if (action.name.includes("Status")) {
          const published = args[0] as boolean;
          setAllPosts((prev) =>
            prev.map((p) =>
              selectedPosts.has(p.id) ? { ...p, published } : p,
            ),
          );
        }
        setSelectedPosts(new Set());
      }
    };

  return {
    posts: allPosts,
    paginatedPosts,
    isLoading,
    selectedPosts,
    setSelectedPosts,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems: filteredPosts.length,
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
    handleFormSubmit,
    handleUpload,
    handleConfirmAndProcessUploads,
    handleBulkDelete: createBulkAction((posts) => handleBulkDelete(posts)),
    handleBulkTagUpdate: createBulkAction(handleBulkTagUpdate),
    handleBulkDownload: () => handleBulkDownload(selectedPosts, allPosts),
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
  };
};
