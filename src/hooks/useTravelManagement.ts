import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation, Post } from "@/types";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { parseCsv } from "@/utils/csv.ts";
import { sanitizeFileName } from "@/lib/utils";
import {
  fetchLocations,
  fetchBlogPosts,
  geocodeLocation,
  processUploads,
  handleBulkDelete,
  handleBulkPublish,
  handleBulkDownload,
} from "@/components/travel/TravelManagementUtils.ts";
import { LocationFormData } from "@/components/travel/TravelLocationForm.tsx";
import { useManagement } from "./useManagement"; // Import the generic hook

type LocationUpdateItem = { existingId: string; existingTitle: string; newData: any };

export const useTravelManagement = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { user } = useAuth();
  const [blogPosts, setBlogPosts] = useState<Pick<Post, 'id' | 'title'>[]>([]);
  const [editingLocation, setEditingLocation] = useState<TravelLocation | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [locationsToInsert, setLocationsToInsert] = useState<any[]>([]);
  const [locationsToUpdate, setLocationsToUpdate] = useState<LocationUpdateItem[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  const {
    allItems: locations,
    paginatedItems: paginatedLocations,
    isLoading,
    selectedItems,
    setSelectedItems, // Keep setSelectedItems for local use
    currentPage,
    totalPages,
    itemsPerPage: locationsPerPage,
    totalItems: totalLocations,
    loadItems: loadLocations,
    handlePageChange: setCurrentPage,
    handleItemsPerPageChange: setLocationsPerPage,
    handleSelectItem: handleSelectLocation,
    handleSelectAllOnPage: handleSelectAll,
    handleBulkDelete: genericHandleBulkDelete,
    handleBulkStatusChange: genericHandleBulkPublish,
    handleBulkDownload: genericHandleBulkDownload,
    handleToggleStatus: handleTogglePublish, // Renamed to match component prop
    allOnPageSelected,
  } = useManagement<TravelLocation>({
    fetchData: fetchLocations,
    deleteItems: handleBulkDelete,
    updateItemStatus: handleBulkPublish,
    downloadItems: (ids, allItems) => handleBulkDownload(ids, allItems, blogPosts), // Pass blogPosts as extraData
    idKey: 'id',
    statusKey: 'published',
  });

  useEffect(() => {
    const fetchInitialBlogPosts = async () => {
      const fetchedBlogPosts = await fetchBlogPosts();
      setBlogPosts(fetchedBlogPosts);
    };
    fetchInitialBlogPosts();
  }, []);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !isUpdateDialogVisible,
  });

  const onSubmit = useCallback(async (values: LocationFormData) => {
    if (!user) {
      showError("You must be logged in to add or update locations.");
      return;
    }
    const toastId = showLoading(editingLocation ? "Updating location..." : "Adding new location...");
    
    try {
      let { latitude: currentLatitude, longitude: currentLongitude } = values;

      if ((currentLatitude === undefined || currentLongitude === undefined) && values.name) {
        const { latitude, longitude } = await geocodeLocation(values.name);
        currentLatitude = latitude;
        currentLongitude = longitude;
      }

      if (currentLatitude === undefined || currentLongitude === undefined) {
        throw new Error("Coordinates are required. Could not automatically find them for the given place name.");
      }

      if (!editingLocation) {
        const isDuplicate = locations.some(loc => 
          loc.name.toLowerCase() === values.name.toLowerCase() ||
          (loc.latitude === currentLatitude && loc.longitude === currentLongitude)
        );
        if (isDuplicate) {
          throw new Error("A location with the same name or coordinates already exists.");
        }
      }

      const existingLocation = locations.find(l => l.id === editingLocation?.id);
      let imageUrl = existingLocation?.marker_image_url || null;

      if (values.image && values.image.length > 0) {
        const file = values.image[0];
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;

        if (editingLocation && imageUrl) {
          const oldFileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
          const { error: removeError } = await supabase.storage.from('mapmarkers').remove([oldFileName]);
          if (removeError) {
            showError(`Could not remove old image: ${removeError.message}`);
          }
        }

        const { error: uploadError } = await supabase.storage.from('mapmarkers').upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('mapmarkers').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const locationData = {
        title: values.title,
        description: values.description,
        name: values.name,
        latitude: currentLatitude,
        longitude: currentLongitude,
        blog_url: values.blog_url,
        marker_image_url: imageUrl,
        user_id: user.id,
        published: values.published,
      };

      let error;
      if (editingLocation) {
        const { error: updateError } = await supabase.from("travel_locations").update(locationData).eq("id", editingLocation.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("travel_locations").insert([locationData]);
        error = insertError;
      }

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Location ${editingLocation ? "updated" : "added"} successfully!`);
      cancelEdit();
      loadLocations();
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Operation failed: ${error.message}`);
    }
  }, [user, editingLocation, locations, loadLocations]);

  const handleEdit = useCallback((location: TravelLocation) => {
    setEditingLocation(location);
    setEditingImageUrl(location.marker_image_url || null);
  }, []);

  const handleRemoveImage = useCallback(async () => {
    if (!editingLocation || !editingImageUrl) return;

    const toastId = showLoading("Removing image...");
    try {
      const fileName = editingImageUrl.substring(editingImageUrl.lastIndexOf('/') + 1);
      const { error: removeError } = await supabase.storage.from('mapmarkers').remove([fileName]);
      if (removeError) throw removeError;

      const { error: updateError } = await supabase.from("travel_locations").update({ marker_image_url: null }).eq("id", editingLocation.id);
      if (updateError) throw updateError;
      
      dismissToast(toastId);
      showSuccess("Image removed successfully.");
      setEditingImageUrl(null);
      loadLocations();
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  }, [editingLocation, editingImageUrl, loadLocations]);
  
  const cancelEdit = useCallback(() => {
    setEditingLocation(null);
    setEditingImageUrl(null);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    } else {
      setUploadFile(null);
    }
  }, []);

  const handleBulkUpload = useCallback(async (fileInputRef: React.RefObject<HTMLInputElement>) => {
    if (!uploadFile || !user) return;

    setIsUploading(true);
    const toastId = showLoading("Processing CSV file...");

    try {
      const fileContent = await uploadFile.text();
      const parsedData = parseCsv(fileContent);

      if (parsedData.length === 0) throw new Error("No data rows found in CSV.");

      const blogTitleMap = new Map(blogPosts.map(p => [p.title.toLowerCase(), p.id]));
      
      const newLocations: any[] = [];
      const potentialUpdates: LocationUpdateItem[] = [];
      const failedRows = [];

      for (const [index, row] of parsedData.entries()) {
        try {
          if (!row.title || !row.name) throw new Error("Missing required 'title' or 'name'.");

          let latitude: number | undefined = row.latitude ? parseFloat(row.latitude) : undefined;
          let longitude: number | undefined = row.longitude ? parseFloat(row.longitude) : undefined;

          if ((latitude === undefined || longitude === undefined) && row.name) {
            const { latitude: geoLat, longitude: geoLon } = await geocodeLocation(row.name);
            latitude = geoLat;
            longitude = geoLon;
          }
          if (latitude === undefined || longitude === undefined) throw new Error(`Could not determine coordinates for "${row.name}".`);

          let blog_url = null;
          if (row.blog_title) {
            const postId = blogTitleMap.get(row.blog_title.toLowerCase());
            if (postId) blog_url = `/blog/${postId}`;
          }

          const locationData = {
            title: row.title,
            name: row.name,
            description: row.description || null,
            latitude: latitude,
            longitude: longitude,
            blog_url: blog_url,
            marker_image_url: row.marker_image_url || null,
            published: row.published ? row.published.toLowerCase() === 'true' : false,
          };

          const existingLocation = locations.find(loc => loc.name.toLowerCase() === locationData.name.toLowerCase());

          if (existingLocation) {
            potentialUpdates.push({
              existingId: existingLocation.id,
              existingTitle: existingLocation.title,
              newData: locationData
            });
          } else {
            newLocations.push(locationData);
          }
        } catch (error: any) {
          failedRows.push({ row: index + 2, error: error.message });
        }
      }

      dismissToast(toastId);

      if (failedRows.length > 0) {
        showError(`${failedRows.length} rows failed to process. See console for details.`);
        console.error("Bulk upload failures:", failedRows);
      }

      setLocationsToInsert(newLocations);
      setLocationsToUpdate(potentialUpdates);

      if (potentialUpdates.length > 0) {
        setSelectedUpdates(new Set());
        setIsUpdateDialogVisible(true);
      } else if (newLocations.length > 0) {
        await processUploads(user.id, newLocations, []);
        loadLocations();
      } else if (failedRows.length === 0) {
        showSuccess("No new locations to import.");
      }

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    } finally {
      setIsUploading(false);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadFile, user, blogPosts, locations, loadLocations]);

  const handleConfirmAndProcessUploads = useCallback(async () => {
    if (!user) return;
    setIsUpdateDialogVisible(false);
    
    const updatesToPerform = locationsToUpdate.filter(u => selectedUpdates.has(u.existingId)).map(u => ({
        existingId: u.existingId,
        newData: u.newData
    }));

    const skippedCount = locationsToUpdate.length - updatesToPerform.length;

    const success = await processUploads(user.id, locationsToInsert, updatesToPerform);

    if (success) {
      if (skippedCount > 0) {
        showError(`${skippedCount} potential updates were skipped.`);
      }
      loadLocations();
    }
    
    setLocationsToInsert([]);
    setLocationsToUpdate([]);
    setSelectedUpdates(new Set());
  }, [user, locationsToInsert, locationsToUpdate, selectedUpdates, loadLocations]);

  // --- Wrappers to match TravelLocationList component signatures ---
  const handleBulkDeleteWrapper = useCallback(() => genericHandleBulkDelete(selectedItems, setSelectedItems, locations), [genericHandleBulkDelete, selectedItems, setSelectedItems, locations]);
  const handleBulkPublishWrapper = useCallback((status: boolean) => genericHandleBulkPublish(selectedItems, setSelectedItems, status), [genericHandleBulkPublish, selectedItems, setSelectedItems]);
  const handleBulkDownloadWrapper = useCallback(() => genericHandleBulkDownload(selectedItems, setSelectedItems, locations), [genericHandleBulkDownload, selectedItems, setSelectedItems, locations]);
  // -----------------------------------------------------------------

  return {
    locations,
    blogPosts,
    editingLocation,
    editingImageUrl,
    uploadFile,
    isUploading,
    selectedLocations: selectedItems, // Expose as selectedLocations for component compatibility
    currentPage,
    locationsPerPage,
    isUpdateDialogVisible,
    locationsToInsert,
    locationsToUpdate,
    selectedUpdates,
    paginatedLocations,
    totalPages,
    allOnPageSelected,
    setUploadFile,
    setEditingLocation,
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
    handleTogglePublish, // Expose as handleTogglePublish for component compatibility
    setCurrentPage,
    handleItemsPerPageChange: setLocationsPerPage, // Corrected shorthand property
    totalItems: totalLocations, // Expose as totalItems for component compatibility
    isLoading,
  };
};