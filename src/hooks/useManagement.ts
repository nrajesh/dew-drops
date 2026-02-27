import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { showError } from "@/utils/toast";
import { usePagination } from "@/hooks/usePagination";

interface UseManagementOptions<T> {
  fetchData: () => Promise<T[]>;
  deleteItems: (ids: string[], allItems: T[]) => Promise<boolean>;
  updateItemStatus?: (ids: Set<string>, status: boolean) => Promise<boolean>;
  updateItemTags?: (ids: Set<string>, tags: string[]) => Promise<boolean>;
  generateItemTags?: (ids: Set<string>, allItems: T[]) => Promise<number>;
  downloadItems?: (
    ids: Set<string>,
    allItems: T[],
    extraData?: unknown,
  ) => Promise<void>;
  initialItemsPerPage?: number;
  idKey?: keyof T;
  statusKey?: keyof T;
  filterFn?: (item: T, searchTerm: string) => boolean;
}

export const useManagement = <T extends { id: string }>(
  options: UseManagementOptions<T>,
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
    idKey = "id" as keyof T,
    statusKey = "published" as keyof T,
    filterFn,
  } = options;

  const [allItems, setAllItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [searchTerm, setSearchTerm] = useState("");

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    const fetched = await fetchData();
    setAllItems(fetched);
    setIsLoading(false);
  }, [fetchData]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    if (!filterFn || !searchTerm) {
      return allItems;
    }
    return allItems.filter((item) => filterFn(item, searchTerm));
  }, [allItems, searchTerm, filterFn]);

  const { currentPage, setCurrentPage, totalPages, paginatedItems } =
    usePagination(filteredItems, itemsPerPage);

  const handleItemsPerPageChange = useCallback((value: number) => {
    setItemsPerPage(value);
  }, []);

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }, []);

  const handleSelectAllOnPage = useCallback(
    (checked: boolean) => {
      const pageIds = new Set(
        paginatedItems.map((item) => String(item[idKey])),
      );
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          pageIds.forEach((id) => newSet.add(id));
        } else {
          pageIds.forEach((id) => newSet.delete(id));
        }
        return newSet;
      });
    },
    [paginatedItems, idKey],
  );

  const handleBulkDelete = useCallback(
    async (
      ids: Set<string>,
      setter: (s: Set<string>) => void,
      allItems: T[],
    ) => {
      if (!user) {
        showError("You must be logged in to delete items.");
        return;
      }
      if (ids.size === 0) return;
      if (await deleteItems(Array.from(ids), allItems)) {
        setter(new Set());
        loadItems();
      }
    },
    [user, deleteItems, loadItems],
  );

  const handleBulkStatusChange = useCallback(
    async (
      ids: Set<string>,
      setter: (s: Set<string>) => void,
      status: boolean,
    ) => {
      if (!user) {
        showError("You must be logged in to change item status.");
        return;
      }
      if (ids.size === 0 || !updateItemStatus) return;
      if (await updateItemStatus(ids, status)) {
        setter(new Set());
        loadItems();
      }
    },
    [user, updateItemStatus, loadItems],
  );

  const handleBulkTagUpdate = useCallback(
    async (
      ids: Set<string>,
      setter: (s: Set<string>) => void,
      tags: string[],
    ) => {
      if (!user) {
        showError("You must be logged in to update tags.");
        return;
      }
      if (ids.size === 0 || !updateItemTags) return;
      if (await updateItemTags(ids, tags)) {
        setter(new Set());
        loadItems();
      }
    },
    [user, updateItemTags, loadItems],
  );

  const handleGenerateTags = useCallback(
    async (
      ids: Set<string>,
      setter: (s: Set<string>) => void,
      allItems: T[],
    ) => {
      if (!user) {
        showError("You must be logged in to generate tags.");
        return;
      }
      if (ids.size === 0 || !generateItemTags) return;
      if ((await generateItemTags(ids, allItems)) > 0) {
        setter(new Set());
        loadItems();
      }
    },
    [user, generateItemTags, loadItems],
  );

  const handleBulkDownload = useCallback(
    async (
      ids: Set<string>,
      setter: (s: Set<string>) => void,
      allItems: T[],
      extraData?: unknown,
    ) => {
      if (ids.size === 0 || !downloadItems) return;
      await downloadItems(ids, allItems, extraData);
      setter(new Set());
    },
    [downloadItems],
  );

  const handleToggleStatus = useCallback(
    async (item: T) => {
      if (!user) {
        showError("You must be logged in to change item status.");
        return;
      }
      if (!updateItemStatus) return;
      const currentStatus = item[statusKey] as unknown as boolean;
      if (
        await updateItemStatus(new Set([String(item[idKey])]), !currentStatus)
      ) {
        loadItems();
      }
    },
    [user, updateItemStatus, loadItems, idKey, statusKey],
  );

  const allOnPageSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedItems.has(String(item[idKey])));

  return {
    allItems,
    paginatedItems,
    isLoading,
    selectedItems,
    setSelectedItems,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems: filteredItems.length,
    loadItems,
    handlePageChange: setCurrentPage,
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
    searchTerm,
    setSearchTerm,
  };
};
