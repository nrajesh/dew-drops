"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/AuthContext';

interface ManageableItem {
  id: string;
  user_id?: string;
  published?: boolean;
  file_name?: string; // For items that might have associated files (like images)
  image_url?: string; // For items that might have an image URL
  [key: string]: any;
}

interface UseManagementOptions {
  tableName: string;
  storageBucketName?: string; // Optional, for items with associated files
}

export const useManagement = <T extends ManageableItem>(
  fetchFunction: () => Promise<T[]>,
  options: UseManagementOptions
) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allItems, setAllItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { tableName, storageBucketName } = options;

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFunction();
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
  }, [fetchFunction, toast]);

  useEffect(() => {
    if (user) {
      loadItems();
    } else {
      setAllItems([]);
      setIsLoading(false);
    }
  }, [user, loadItems]);

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

  const handleCreate = useCallback(async (formData: Omit<T, 'id' | 'user_id' | 'created_at' | 'image_url'>, file?: File | null) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let itemDataToInsert: Partial<T> = { ...formData, user_id: user.id };
      let imageUrl: string | undefined;

      if (file && storageBucketName && formData.file_name) {
        const filePath = `${user.id}/${formData.file_name}`;
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
      let currentItem = allItems.find(item => item.id === id);

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
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setAllItems((prev) => prev.map((item) => (item.id === id ? (data as T) : item)));
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
  }, [user, allItems, toast, tableName, storageBucketName]);

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
          .filter(item => ids.includes(item.id) && item.file_name)
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
        .in('id', ids)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setAllItems((prev) => prev.filter((item) => !ids.includes(item.id)));
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
  }, [user, allItems, clearSelectedItems, toast, tableName, storageBucketName]);

  const handleTogglePublish = useCallback(async (item: T) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const newPublishedStatus = !item.published;
      const { data, error: updateError } = await supabase
        .from(tableName)
        .update({ published: newPublishedStatus })
        .eq('id', item.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setAllItems((prev) => prev.map((i) => (i.id === item.id ? (data as T) : i)));
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
  }, [user, toast, tableName]);

  const handleBulkPublish = useCallback(async () => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    if (selectedItems.size === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const ids = Array.from(selectedItems);
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ published: true })
        .in('id', ids)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAllItems((prev) =>
        prev.map((item) => (ids.includes(item.id) ? { ...item, published: true } : item))
      );
      clearSelectedItems();
      toast({
        title: 'Success',
        description: 'Selected items published successfully.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to bulk publish items.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to bulk publish items.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedItems, clearSelectedItems, toast, tableName]);

  const handleBulkUnpublish = useCallback(async () => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    if (selectedItems.size === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const ids = Array.from(selectedItems);
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ published: false })
        .in('id', ids)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAllItems((prev) =>
        prev.map((item) => (ids.includes(item.id) ? { ...item, published: false } : item))
      );
      clearSelectedItems();
      toast({
        title: 'Success',
        description: 'Selected items unpublished successfully.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to bulk unpublish items.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to bulk unpublish items.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedItems, clearSelectedItems, toast, tableName]);

  const handleBulkDelete = useCallback(async () => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    if (selectedItems.size === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const ids = Array.from(selectedItems);
      await handleDelete(ids); // Reuse single delete logic
      toast({
        title: 'Success',
        description: 'Selected items deleted successfully.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to bulk delete items.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to bulk delete items.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedItems, handleDelete, toast]);

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
    handleTogglePublish,
    handleBulkPublish,
    handleBulkUnpublish,
    handleBulkDelete,
  };
};