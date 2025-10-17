import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { showError } from "@/utils/toast";

interface UseManagementOptions<T> {
  fetchData: () => Promise<T[]>;
  deleteItems: (ids: string[], allItems: T[]) => Promise<boolean>;
  updateItemStatus?: (ids: Set<string>, status: boolean) => Promise<boolean>; // Removed allItems from signature here, as it's often not needed in the utility function itself
  updateItemTags?: (ids: Set<string>, tags: string[]) => Promise<boolean>; // Removed allItems
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

  // --- Generic Bulk Handlers (now exposed for external use) ---

  const handleBulkDelete = useCallback(async (ids: Set<string>, setter: (s: Set<string>) => void, allItems: T[]) => {
    if (!user) {
      showError("You must be logged in to delete items.");
      return;
    }
    if (ids.size === 0) return;

    const success = await deleteItems(Array.from(ids), allItems);
    if (success) {
      setter(new Set());
      loadItems();
    }
  }, [user, deleteItems, loadItems]);

  const handleBulkStatusChange = useCallback(async (ids: Set<string>, setter: (s: Set<string>) => void, status: boolean) => {
    if (!user) {
      showError("You must be logged in to change item status.");
      return;
    }
    if (ids.size === 0 || !updateItemStatus) return;

    const success = await updateItemStatus(ids, status);
    if (success) {
      setter(new Set());
      loadItems();
    }
  }, [user, updateItemStatus, loadItems]);

  const handleBulkTagUpdate = useCallback(async (ids: Set<string>, setter: (s: Set<string>) => void, tags: string[]) => {
    if (!user) {
      showError("You must be logged in to update tags.");
      return;
    }
    if (ids.size === 0 || !updateItemTags) return;

    const success = await updateItemTags(ids, tags);
    if (success) {
      setter(new Set());
      loadItems();
    }
  }, [user, updateItemTags, loadItems]);

  const handleGenerateTags = useCallback(async (ids: Set<string>, setter: (s: Set<string>) => void, allItems: T[]) => {
    if (!user) {
      showError("You must be logged in to generate tags.");
      return;
    }
    if (ids.size === 0 || !generateItemTags) return;

    const successCount = await generateItemTags(ids, allItems);
    if (successCount > 0) {
      setter(new Set());
      loadItems();
    }
  }, [user, generateItemTags, loadItems]);

  const handleBulkDownload = useCallback(async (ids: Set<string>, setter: (s: Set<string>) => void, allItems: T[], extraData?: any) => {
    if (ids.size === 0 || !downloadItems) return;
    await downloadItems(ids, allItems, extraData);
    setter(new Set());
  }, [downloadItems]);

  const handleToggleStatus = useCallback(async (item: T) => {
    if (!user) {
      showError("You must be logged in to change item status.");
      return;
    }
    if (!updateItemStatus) return;

    const currentStatus = item[statusKey] as unknown as boolean; // Cast to boolean
    const success = await updateItemStatus(new Set([String(item[idKey])]), !currentStatus);
    if (success) {
      loadItems();
    }
  }, [user, updateItemStatus, loadItems, idKey, statusKey]);

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
    // Expose generic handlers with explicit signatures for use in other hooks
    handleBulkDelete,
    handleBulkStatusChange,
    handleBulkTagUpdate,
    handleGenerateTags,
    handleBulkDownload,
    handleToggleStatus,
    allOnPageSelected,
  };
};