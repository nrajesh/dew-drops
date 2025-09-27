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
  processUploads,
  handleBulkDelete,
  handleBulkPublish,
  handleBulkDownload,
} from "@/components/travel/TravelManagementUtils.ts";
import { LocationFormData } from "@/components/travel/TravelLocationForm.tsx";

type LocationUpdateItem = { existingId: string; existingTitle: string; newData: any };

export const useTravelManagement = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [blogPosts, setBlogPosts] = useState<Pick<Post, 'id' | 'title'>[]>([]);
  const [editingLocation, setEditingLocation] = useState<TravelLocation | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [locationsPerPage, setLocationsPerPage] = useState(10);

  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [locationsToInsert, setLocationsToInsert] = useState<any[]>([]);
  const [locationsToUpdate, setLocationsToUpdate] = useState<LocationUpdateItem[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const [fetchedLocations, fetchedBlogPosts] = await Promise.all([
      fetchLocations(),
      fetchBlogPosts(),
    ]);
    setLocations(fetchedLocations);
    setBlogPosts(fetchedBlogPosts);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paginatedLocations = useMemo(() => {
    const startIndex = (currentPage - 1) * locationsPerPage;
    return locations.slice(startIndex, startIndex + locationsPerPage);
  }, [locations, currentPage, locationsPerPage]);

  const totalPages = Math.ceil(locations.length / locationsPerPage);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !isUpdateDialogVisible,
  });

  const handleItemsPerPageChange = useCallback((value: number) => {
    setLocationsPerPage(value);
    setCurrentPage(1);
  }, []);

  const onSubmit = useCallback(async (values: LocationFormData) => {
    if (!user) {
      showError("You must be logged in to add or update locations.");
      return;
    }
    const toastId = showLoading(editingLocation ? "Updating location..." : "Adding new location...");
    
    try {
      let { latitude: currentLatitude, longitude: currentLongitude } = values;

      if ((currentLatitude === undefined || currentLongitude === undefined) && values.name) {
        const geocodeToastId = showLoading(`Finding coordinates for ${values.name}...`);
        try {
          const { data, error } = await supabase.functions.invoke('geocode-location', {
            body: { locationName: values.name },
          });

          if (error) {
            const errorBody = await error.context.json();
            throw new Error(errorBody.error || error.message);
          }
          
          if (data?.error) {
            throw new Error(data.error);
          }

          currentLatitude = data.latitude;
          currentLongitude = data.longitude;
          dismissToast(geocodeToastId);
        } catch (geoError) {
          dismissToast(geocodeToastId);
          throw geoError; // Re-throw to be caught by the main catch block
        }
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
      loadData();
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Operation failed: ${error.message}`);
    }
  }, [user, editingLocation, locations, loadData]);

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
      loadData();
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  }, [editingLocation, editingImageUrl, loadData]);
  
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
            const geocodeToastId = showLoading(`Finding coordinates for ${row.name}...`);
            try {
              const { data, error } = await supabase.functions.invoke('geocode-location', {
                body: { locationName: row.name },
              });

              if (error) {
                const errorBody = await error.context.json();
                throw new Error(errorBody.error || error.message);
              }
              
              if (data?.error) {
                throw new Error(data.error);
              }

              latitude = data.latitude;
              longitude = data.longitude;
            } finally {
              dismissToast(geocodeToastId);
            }
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
        loadData();
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
  }, [uploadFile, user, blogPosts, locations, loadData]);

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
      loadData();
    }
    
    setLocationsToInsert([]);
    setLocationsToUpdate([]);
    setSelectedUpdates(new Set());
  }, [user, locationsToInsert, locationsToUpdate, selectedUpdates, loadData]);

  const handleBulkDeleteWrapper = useCallback(async () => {
    const success = await handleBulkDelete(selectedLocations, locations);
    if (success) {
      loadData();
      setSelectedLocations(new Set());
    }
  }, [selectedLocations, locations, loadData]);

  const handleBulkPublishWrapper = useCallback(async (publishStatus: boolean) => {
    const success = await handleBulkPublish(selectedLocations, publishStatus);
    if (success) {
      loadData();
      setSelectedLocations(new Set());
    }
  }, [selectedLocations, loadData]);

  const handleBulkDownloadWrapper = useCallback(async () => {
    await handleBulkDownload(selectedLocations, locations, blogPosts);
  }, [selectedLocations, locations, blogPosts]);

  const handleSelectLocation = useCallback((id: string) => {
    setSelectedLocations(prev => {
      const newSelected = new Set(prev);
      newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    const pageIds = new Set(paginatedLocations.map(l => l.id));
    if (checked) {
      setSelectedLocations(prev => new Set([...prev, ...pageIds]));
    } else {
      setSelectedLocations(prev => {
        const newSet = new Set(prev);
        pageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [paginatedLocations]);

  const handleTogglePublish = useCallback(async (location: TravelLocation) => {
    const newPublishedStatus = !location.published;
    const toastId = showLoading(newPublishedStatus ? "Publishing..." : "Unpublishing...");

    const { error } = await supabase
      .from("travel_locations")
      .update({ published: newPublishedStatus })
      .eq("id", location.id);

    if (error) {
      dismissToast(toastId);
      showError(`Failed to update status: ${error.message}`);
    } else {
      dismissToast(toastId);
      showSuccess(`Location ${newPublishedStatus ? "published" : "unpublished"}.`);
      setLocations(locations.map(l => l.id === location.id ? { ...l, published: newPublishedStatus } : l));
    }
  }, [locations]);

  const allOnPageSelected = paginatedLocations.length > 0 && paginatedLocations.every(l => selectedLocations.has(l.id));

  return {
    locations,
    blogPosts,
    editingLocation,
    editingImageUrl,
    uploadFile,
    isUploading,
    selectedLocations,
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
    handleTogglePublish,
    setCurrentPage,
    handleItemsPerPageChange,
  };
};