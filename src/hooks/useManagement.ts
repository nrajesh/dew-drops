"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/AuthContext';

interface ManageableItem {
  id: string;
  user_id?: string;
  published?: boolean;
  file_name?: string; // For items that might have associated files (like images)
  image_url?: string; // For items that might have an image URL
  tags?: string[]; // For items that have tags
  [key: string]: any;
}

interface UseManagementOptions<T extends ManageableItem> {
  tableName: string;
  storageBucketName?: string; // Optional, for items with associated files
  initialItemsPerPage?: number;
  idKey: keyof T;
  statusKey: keyof T;
  fetchData: () => Promise<T[]>;
  deleteItems: (ids: string[], allItems: T[]) => Promise<boolean>;
  updateItemStatus: (ids: Set<string>, status: boolean) => Promise<boolean>;
  updateItemTags?: (ids: Set<string>, tags: string[]) => Promise<boolean>; // Made optional
  downloadItems?: (ids: Set<string>, allItems: T[]) => Promise<void>;
}

export const useManagement = <T extends ManageableItem>(options: UseManagementOptions<T>) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allItems, setAllItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(options.initialItemsPerPage || 10);

  const { tableName, storageBucketName, idKey, statusKey, fetchData, deleteItems, updateItemStatus, updateItemTags, downloadItems } = options;

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchData();
      setAllItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch items.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to fetch items.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, toast]);

  useEffect(() => {
    if (user) {
      loadItems();
    } else {
      setAllItems([]);
      setIsLoading(false);
    }
  }, [user, loadItems]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return allItems;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allItems.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      )
    );
  }, [allItems, searchTerm]);

  const totalPages = useMemo(() => Math.ceil(filteredItems.length / itemsPerPage), [filteredItems, itemsPerPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when items per page changes
  }, []);

  const toggleSelectItem = useCallback((id: string) => {
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

  const clearSelectedItems = useCallback(() => {
    setSelectedItems(new Set());
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

  const allOnPageSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedItems.has(String(item[idKey])));

  const handleCreate = useCallback(async (formData: Omit<T, 'id' | 'user_id' | 'created_at' | 'image_url'>, file?: File | null) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let itemDataToInsert: Partial<T> = { ...(formData as Partial<T>), user_id: user.id };
      let imageUrl: string | undefined;

      if (file && storageBucketName && (formData as any).file_name) { // Cast to any to access file_name
        const filePath = `${user.id}/${(formData as any).file_name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(storageBucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from(storageBucketName)
          .getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
        itemDataToInsert.image_url = imageUrl;
      }

      const { data, error: insertError } = await supabase
        .from(tableName)
        .insert(itemDataToInsert)
        .select()
        .single();

      if (insertError) throw insertError;

      setAllItems((prev) => [data as T, ...prev]);
      toast({
        title: 'Success',
        description: 'Item created successfully.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create item.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to create item.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, tableName, storageBucketName]);

  const handleUpdate = useCallback(async (id: string, formData: Partial<T>, file?: File | null) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let itemDataToUpdate: Partial<T> = { ...formData };
      let currentItem = allItems.find(item => String(item[idKey]) === id);

      if (file && storageBucketName && currentItem?.file_name) {
        const filePath = `${user.id}/${currentItem.file_name}`;
        const { error: uploadError } = await supabase.storage
          .from(storageBucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from(storageBucketName)
          .getPublicUrl(filePath);
        itemDataToUpdate.image_url = publicUrlData.publicUrl;
      }

      const { data, error: updateError } = await supabase
        .from(tableName)
        .update(itemDataToUpdate)
        .eq(idKey as string, id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setAllItems((prev) => prev.map((item) => (String(item[idKey]) === id ? (data as T) : item)));
      toast({
        title: 'Success',
        description: 'Item updated successfully.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update item.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to update item.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, allItems, toast, tableName, storageBucketName, idKey]);

  const handleDelete = useCallback(async (ids: string[]) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (storageBucketName) {
        const filesToDelete = allItems
          .filter(item => ids.includes(String(item[idKey])) && item.file_name)
          .map(item => `${user.id}/${item.file_name}`);

        if (filesToDelete.length > 0) {
          const { error: deleteFilesError } = await supabase.storage
            .from(storageBucketName)
            .remove(filesToDelete);

          if (deleteFilesError) {
            console.error('Error deleting files from storage:', deleteFilesError);
          }
        }
      }

      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .in(idKey as string, ids)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setAllItems((prev) => prev.filter((item) => !ids.includes(String(item[idKey]))));
      clearSelectedItems();
      toast({
        title: 'Success',
        description: 'Items deleted successfully.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to delete items.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete items.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, allItems, clearSelectedItems, toast, tableName, storageBucketName, idKey]);

  const handleToggleStatus = useCallback(async (item: T) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const newPublishedStatus = !(item[statusKey] as boolean);
      const { data, error: updateError } = await supabase
        .from(tableName)
        .update({ [statusKey]: newPublishedStatus })
        .eq(idKey as string, item[idKey])
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setAllItems((prev) => prev.map((i) => (String(i[idKey]) === String(item[idKey]) ? (data as T) : i)));
      toast({
        title: 'Success',
        description: `Item ${newPublishedStatus ? 'published' : 'unpublished'} successfully.`,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to toggle publish status.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to toggle publish status.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, tableName, idKey, statusKey]);

  const handleBulkStatusChange = useCallback(async (ids: Set<string>, status: boolean) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    if (ids.size === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const success = await updateItemStatus(ids, status); // updateItemStatus now returns boolean
      if (!success) throw new Error(`Failed to bulk ${status ? 'publish' : 'unpublish'} items.`);

      setAllItems((prev) =>
        prev.map((item) => (ids.has(String(item[idKey])) ? { ...item, [statusKey]: status } : item))
      );
      clearSelectedItems();
      toast({
        title: 'Success',
        description: `Selected items ${status ? 'published' : 'unpublished'} successfully.`,
      });
    } catch (err: any) {
      setError(err.message || `Failed to bulk ${status ? 'publish' : 'unpublish'} items.`);
      toast({
        title: 'Error',
        description: err.message || `Failed to bulk ${status ? 'publish' : 'unpublish'} items.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedItems, clearSelectedItems, toast, tableName, idKey, statusKey, updateItemStatus]);

  const handleBulkTagUpdate = useCallback(async (ids: Set<string>, tags: string[]) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    if (ids.size === 0) return;
    if (!updateItemTags) {
      setError('Tag update function not provided in options.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const success = await updateItemTags(ids, tags); // updateItemTags now returns boolean
      if (!success) throw new Error('Failed to bulk update tags.');

      setAllItems((prev) =>
        prev.map((item) => (ids.has(String(item[idKey])) ? { ...item, tags: tags } : item))
      );
      clearSelectedItems();
      toast({
        title: 'Success',
        description: 'Selected items tags updated successfully.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to bulk update tags.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to bulk update tags.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedItems, clearSelectedItems, toast, tableName, idKey, updateItemTags]);

  const handleBulkDownload = useCallback(async (ids: Set<string>) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    if (ids.size === 0) return;
    if (!downloadItems) {
      setError('Download function not provided in options.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await downloadItems(ids, allItems);
      clearSelectedItems();
      toast({
        title: 'Success',
        description: 'Selected items downloaded successfully.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to bulk download items.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to bulk download items.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedItems, clearSelectedItems, toast, downloadItems, allItems]);


  return {
    allItems,
    setAllItems,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    selectedItems,
    toggleSelectItem,
    clearSelectedItems,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleToggleStatus,
    handleBulkStatusChange,
    handleBulkTagUpdate,
    handleBulkDownload,
    paginatedItems,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems: filteredItems.length,
    handlePageChange,
    handleItemsPerPageChange,
    handleSelectAllOnPage,
    allOnPageSelected,
  };
};