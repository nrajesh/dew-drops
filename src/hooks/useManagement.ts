import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { showError } from "@/utils/toast";

interface UseManagementOptions<T> {
  fetchData: () => Promise<T[]>;
  deleteItems: (ids: string[], allItems: T[]) => Promise<boolean>;
  updateItemStatus?: (ids: Set<string>, status: boolean, allItems: T[]) => Promise<boolean>;
  updateItemTags?: (ids: Set<string>, tags: string[], allItems: T[]) => Promise<boolean>;
  generateItemTags?: (ids: Set<string>, allItems: T[]) => Promise<number>;
  downloadItems?: (ids: Set<string>, allItems: T[], extraData?: any) => Promise<void>;
  initialItemsPerPage?: number;
  idKey?: keyof T; // Key to identify unique items, defaults to 'id'
  statusKey?: keyof T; // Key for published status, defaults to 'published'
}

export const useManagement = <T extends { id: string }>(
  options: UseManagementOptions<T>
) => {
  const { user } = useAuth();
  const {
    fetchData,
    deleteItems,
    updateItemStatus,
    updateItemTags,
    generateItemTags,
    downloadItems,
    initialItemsPerPage = 10,
    idKey = 'id' as keyof T,
    statusKey = 'published' as keyof T,
  } = options;

  const [allItems, setAllItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    const fetched = await fetchData();
    setAllItems(fetched);
    setIsLoading(false);
  }, [fetchData]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Reset to first page when itemsPerPage changes
  useEffect(() => {
    console.log("Items per page changed to:", itemsPerPage); // Debugging line
    setCurrentPage(1);
  }, [itemsPerPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return allItems.slice(startIndex, startIndex + itemsPerPage);
  }, [allItems, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => Math.ceil(allItems.length / itemsPerPage), [allItems, itemsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when items per page changes
  }, []);

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
      return newSelection;
    });
  }, []);

  const handleSelectAllOnPage = useCallback((checked: boolean) => {
    const pageIds = new Set(paginatedItems.map(item => String(item[idKey])));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        pageIds.forEach(id => newSet.add(id));
      } else {
        pageIds.forEach(id => newSet.delete(id));
      }
      return newSet;
    });
  }, [paginatedItems, idKey]);

  const handleBulkDelete = useCallback(async () => {
    if (!user) {
      showError("You must be logged in to delete items.");
      return;
    }
    if (selectedItems.size === 0) return;

    const success = await deleteItems(Array.from(selectedItems), allItems);
    if (success) {
      setSelectedItems(new Set());
      loadItems();
    }
  }, [user, selectedItems, deleteItems, allItems, loadItems]);

  const handleBulkStatusChange = useCallback(async (status: boolean) => {
    if (!user) {
      showError("You must be logged in to change item status.");
      return;
    }
    if (selectedItems.size === 0 || !updateItemStatus) return;

    const success = await updateItemStatus(selectedItems, status, allItems);
    if (success) {
      setSelectedItems(new Set());
      loadItems();
    }
  }, [user, selectedItems, updateItemStatus, allItems, loadItems]);

  const handleBulkTagUpdate = useCallback(async (tags: string[]) => {
    if (!user) {
      showError("You must be logged in to update tags.");
      return;
    }
    if (selectedItems.size === 0 || !updateItemTags) return;

    const success = await updateItemTags(selectedItems, tags, allItems);
    if (success) {
      setSelectedItems(new Set());
      loadItems();
    }
  }, [user, selectedItems, updateItemTags, allItems, loadItems]);

  const handleGenerateTags = useCallback(async () => {
    if (!user) {
      showError("You must be logged in to generate tags.");
      return;
    }
    if (selectedItems.size === 0 || !generateItemTags) return;

    const successCount = await generateItemTags(selectedItems, allItems);
    if (successCount > 0) {
      setSelectedItems(new Set());
      loadItems();
    }
  }, [user, selectedItems, generateItemTags, allItems, loadItems]);

  const handleBulkDownload = useCallback(async (extraData?: any) => {
    if (selectedItems.size === 0 || !downloadItems) return;
    await downloadItems(selectedItems, allItems, extraData);
    setSelectedItems(new Set());
  }, [selectedItems, downloadItems, allItems]);

  const handleToggleStatus = useCallback(async (item: T) => {
    if (!user) {
      showError("You must be logged in to change item status.");
      return;
    }
    if (!updateItemStatus) return;

    const currentStatus = item[statusKey] as unknown as boolean; // Cast to boolean
    const success = await updateItemStatus(new Set([String(item[idKey])]), !currentStatus, allItems);
    if (success) {
      loadItems();
    }
  }, [user, updateItemStatus, allItems, loadItems, idKey, statusKey]);

  const allOnPageSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedItems.has(String(item[idKey])));

  return {
    allItems,
    paginatedItems,
    isLoading,
    selectedItems,
    setSelectedItems,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems: allItems.length,
    loadItems,
    handlePageChange,
    handleItemsPerPageChange,
    handleSelectItem,
    handleSelectAllOnPage,
    handleBulkDelete,
    handleBulkStatusChange,
    handleBulkTagUpdate,
    handleGenerateTags,
    handleBulkDownload,
    handleToggleStatus,
    allOnPageSelected,
  };
};