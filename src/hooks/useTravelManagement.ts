import { useState, useCallback, useMemo, useEffect } from "react";
// import { localDataProvider } from "@/lib/LocalDataProvider";
import { showSuccess, showError, showLoading } from "@/utils/toast";
import { TravelLocation, Post } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePagination } from "./usePagination";
import {
  fetchLocations,
  fetchBlogPosts,
  processUploads,
  handleBulkDelete,
  handleBulkPublish,
  handleBulkDownload,
} from "@/components/travel/TravelManagementUtils";

export const useTravelManagement = (
  containerRef?: React.RefObject<HTMLDivElement>,
) => {
  const { session } = useAuth();
  const user = session?.user;
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [blogPosts, setBlogPosts] = useState<Pick<Post, "id" | "title">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState<TravelLocation | null>(
    null,
  );
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(
    new Set(),
  );

  // Bulk upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [locationsToInsert, setLocationsToInsert] = useState<
    Partial<TravelLocation>[]
  >([]);
  const [locationsToUpdate, setLocationsToUpdate] = useState<
    {
      existingId: string;
      existingTitle: string;
      newData: Partial<TravelLocation>;
    }[]
  >([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(
    new Set(),
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [locs, posts] = await Promise.all([
        fetchLocations(),
        fetchBlogPosts(),
      ]);
      setLocations(locs);
      setBlogPosts(posts);
    } catch (err) {
      showError("Failed to load travel data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLocations = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return locations.filter((loc) => {
      return (
        loc.name.toLowerCase().includes(lowerSearch) ||
        (loc.title && loc.title.toLowerCase().includes(lowerSearch)) ||
        (loc.description && loc.description.toLowerCase().includes(lowerSearch))
      );
    });
  }, [locations, searchTerm]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems: paginatedLocations,
  } = usePagination(filteredLocations, itemsPerPage);

  const totalItems = filteredLocations.length;
  const allOnPageSelected =
    paginatedLocations.length > 0 &&
    paginatedLocations.every((p) => selectedLocations.has(p.id));

  const handleSelectLocation = (id: string) => {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelection = new Set(selectedLocations);
    paginatedLocations.forEach((loc) => {
      if (checked) newSelection.add(loc.id);
      else newSelection.delete(loc.id);
    });
    setSelectedLocations(newSelection);
  };

  const handleEdit = (location: TravelLocation) => {
    setEditingLocation(location);
    setEditingImageUrl(location.marker_image_url || null);
    if (containerRef?.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const cancelEdit = () => {
    setEditingLocation(null);
    setEditingImageUrl(null);
  };

  const handleRemoveImage = () => {
    setEditingImageUrl(null);
  };

  const onSubmit = async (values: unknown) => {
    if (!user) return;
    showLoading(editingLocation ? "Updating..." : "Adding...");
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulation

    console.log("Simulated travel save:", values);
    showSuccess(
      editingLocation
        ? "Location updated (Simulated)."
        : "Location added (Simulated).",
    );
    cancelEdit();
    loadData();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleBulkUpload = async (
    _fileInputRef: React.RefObject<HTMLInputElement>,
  ) => {
    if (!uploadFile) return;
    setIsUploading(true);
    // Simulate parsing
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLocationsToInsert([
      { title: "New Location from CSV", name: "Paris", published: true },
    ]);
    setLocationsToUpdate([]);
    setIsUpdateDialogVisible(true);
    setIsUploading(false);
  };

  const handleConfirmAndProcessUploads = async () => {
    if (!user) return;
    const success = await processUploads(user.id, locationsToInsert, []);
    if (success) {
      setIsUpdateDialogVisible(false);
      setUploadFile(null);
      loadData();
    }
  };

  const handleBulkDeleteWrapper = async () => {
    const success = await handleBulkDelete(
      Array.from(selectedLocations),
      locations,
    );
    if (success) {
      setSelectedLocations(new Set());
      loadData();
    }
  };

  const handleBulkPublishWrapper = async (status: boolean) => {
    const success = await handleBulkPublish(selectedLocations, status);
    if (success) {
      setSelectedLocations(new Set());
      loadData();
    }
  };

  const handleBulkDownloadWrapper = async () => {
    await handleBulkDownload(selectedLocations, locations, blogPosts);
  };

  const handleTogglePublish = async (location: TravelLocation) => {
    const success = await handleBulkPublish(
      new Set([location.id]),
      !location.published,
    );
    if (success) loadData();
  };

  const handleItemsPerPageChange = (val: number) => {
    setItemsPerPage(val);
    setCurrentPage(1);
  };

  return {
    blogPosts,
    editingLocation,
    editingImageUrl,
    uploadFile,
    isUploading,
    selectedLocations,
    currentPage,
    locationsPerPage: itemsPerPage,
    isUpdateDialogVisible,
    locationsToInsert,
    locationsToUpdate,
    selectedUpdates,
    paginatedLocations,
    totalPages,
    allOnPageSelected,
    setSelectedUpdates,
    setIsUpdateDialogVisible,
    onSubmit,
    handleEdit,
    handleRemoveImage,
    cancelEdit,
    handleFileSelect,
    handleBulkUpload,
    handleConfirmAndProcessUploads,
    handleBulkDeleteWrapper,
    handleBulkPublishWrapper,
    handleBulkDownloadWrapper,
    handleSelectLocation,
    handleSelectAll,
    handleTogglePublish,
    setCurrentPage,
    handleItemsPerPageChange,
    totalItems,
    isLoading,
    searchTerm,
    setSearchTerm,
  };
};
