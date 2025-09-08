import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Upload, Trash2, Edit, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation, Post } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ManagementPagination } from "@/components/ManagementPagination";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseCsv } from "@/utils/csv.ts";
import {
  fetchLocations,
  fetchBlogPosts,
  geocodeLocation,
  processUploads,
  handleBulkDelete,
  handleBulkPublish,
  handleBulkDownload,
} from "@/components/travel/TravelManagementUtils.ts";
import { TravelLocationForm, LocationFormData } from "@/components/travel/TravelLocationForm.tsx";
import { sanitizeFileName } from "@/lib/utils";

const ManageTravel = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [blogPosts, setBlogPosts] = useState<Pick<Post, 'id' | 'title'>[]>([]);
  const [editingLocation, setEditingLocation] = useState<TravelLocation | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [locationsPerPage, setLocationsPerPage] = useState(10);

  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [locationsToInsert, setLocationsToInsert] = useState<any[]>([]);
  const [locationsToUpdate, setLocationsToUpdate] = useState<{ existingId: string; existingTitle: string; newData: any }[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [fetchedLocations, fetchedBlogPosts] = await Promise.all([
      fetchLocations(),
      fetchBlogPosts(),
    ]);
    setLocations(fetchedLocations);
    setBlogPosts(fetchedBlogPosts);
  };

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

  const handleItemsPerPageChange = (value: number) => {
    setLocationsPerPage(value);
    setCurrentPage(1);
  };

  async function onSubmit(values: LocationFormData) {
    if (!user) {
      showError("You must be logged in to add or update locations.");
      return;
    }
    const toastId = showLoading(editingLocation ? "Updating location..." : "Adding new location...");
    
    try {
      // Explicitly handle the type from form values (number | '')
      let currentLatitude: number | undefined = values.latitude === '' ? undefined : values.latitude;
      let currentLongitude: number | undefined = values.longitude === '' ? undefined : values.longitude;

      if ((currentLatitude === undefined || currentLongitude === undefined) && values.name) {
        const geocodeToastId = showLoading(`Finding coordinates for ${values.name}...`);
        try {
          const coords = await geocodeLocation(values.name);
          currentLatitude = coords.latitude;
          currentLongitude = coords.longitude;
        } finally {
          dismissToast(geocodeToastId);
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
  };

  const handleEdit = (location: TravelLocation) => {
    setEditingLocation(location);
    setEditingImageUrl(location.marker_image_url || null);
  };

  const handleRemoveImage = async () => {
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
  };
  
  const cancelEdit = () => {
    setEditingLocation(null);
    setEditingImageUrl(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    } else {
      setUploadFile(null);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile || !user) return;

    setIsUploading(true);
    const toastId = showLoading("Processing CSV file...");

    try {
      const fileContent = await uploadFile.text();
      const parsedData = parseCsv(fileContent);

      if (parsedData.length === 0) throw new Error("No data rows found in CSV.");

      const blogTitleMap = new Map(blogPosts.map(p => [p.title.toLowerCase(), p.id]));
      
      const newLocations: any[] = [];
      const potentialUpdates: { existingId: string; existingTitle: string; newData: any }[] = [];
      const failedRows = [];

      for (const [index, row] of parsedData.entries()) {
        try {
          if (!row.title || !row.name) throw new Error("Missing required 'title' or 'name'.");

          let latitude: number | undefined = row.latitude ? parseFloat(row.latitude) : undefined;
          let longitude: number | undefined = row.longitude ? parseFloat(row.longitude) : undefined;

          if ((latitude === undefined || longitude === undefined) && row.name) {
            const coords = await geocodeLocation(row.name);
            latitude = coords.latitude;
            longitude = coords.longitude;
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
  };

  const handleConfirmAndProcessUploads = async () => {
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
  };

  const handleBulkDeleteWrapper = async () => {
    const success = await handleBulkDelete(selectedLocations, locations);
    if (success) {
      loadData();
      setSelectedLocations(new Set());
    }
  };

  const handleBulkPublishWrapper = async (publishStatus: boolean) => {
    const success = await handleBulkPublish(selectedLocations, publishStatus);
    if (success) {
      loadData();
      setSelectedLocations(new Set());
    }
  };

  const handleBulkDownloadWrapper = async () => {
    await handleBulkDownload(selectedLocations, locations, blogPosts);
  };

  const handleSelectAll = (checked: boolean) => {
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
  };

  const handleTogglePublish = async (location: TravelLocation) => {
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
  };

  const allOnPageSelected = paginatedLocations.length > 0 && paginatedLocations.every(l => selectedLocations.has(l.id));

  return (
    <div className="space-y-8" ref={containerRef}>
      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Locations</CardTitle>
          <CardDescription>Upload a semicolon-separated CSV file to add multiple locations at once.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Headers: <code>"title";"name";"blog_title";...</code>
                </p>
                <Button asChild variant="secondary" size="sm">
                    <a href="/sample-travel-locations.csv" download>
                        <Download className="h-4 w-4 mr-2" />
                        Download Sample
                    </a>
                </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                type="file" 
                accept=".csv,text/csv" 
                onChange={handleFileSelect} 
                ref={fileInputRef}
                className="flex-grow"
              />
              <Button onClick={handleBulkUpload} disabled={!uploadFile || isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-8 md:grid-cols-2">
        <TravelLocationForm
          editingLocation={editingLocation}
          editingImageUrl={editingImageUrl}
          blogPosts={blogPosts}
          onSubmit={onSubmit}
          onCancel={cancelEdit}
          onRemoveImage={handleRemoveImage}
        />
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Travel Log</CardTitle>
                <CardDescription>Your current list of visited places.</CardDescription>
              </div>
              {selectedLocations.size > 0 && (
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Bulk Actions ({selectedLocations.size})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleBulkPublishWrapper(true)}>
                        Publish Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkPublishWrapper(false)}>
                        Unpublish Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkDownloadWrapper}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete ({selectedLocations.size})</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete {selectedLocations.size} selected locations and any associated images.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel onClick={() => setSelectedLocations(new Set())}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDeleteWrapper}>Continue</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center border-b pb-2 mb-2 space-x-3">
              <Checkbox id="select-all" onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={allOnPageSelected} disabled={paginatedLocations.length === 0}/>
              <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Select All</label>
            </div>
            <div className="space-y-2 mt-4">
              {locations.length > 0 ? (
                paginatedLocations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Checkbox id={`select-${location.id}`} checked={selectedLocations.has(location.id)} onCheckedChange={() => { const newSelected = new Set(selectedLocations); if (newSelected.has(location.id)) { newSelected.delete(location.id); } else { newSelected.add(location.id); } setSelectedLocations(newSelected); }}/>
                      <label htmlFor={`select-${location.id}`} className="font-medium truncate pr-2 cursor-pointer">{location.title}</label>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={location.published}
                        onCheckedChange={() => handleTogglePublish(location)}
                        aria-label="Publish status"
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}><Edit className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center pt-4">No locations yet. Add one using the form!</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <ManagementPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={locationsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              totalItems={locations.length}
            />
          </CardFooter>
        </Card>
      </div>
      <Dialog open={isUpdateDialogVisible} onOpenChange={setIsUpdateDialogVisible}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Confirm Updates</DialogTitle>
                <DialogDescription>
                    The following locations already exist. Select the ones you want to update with the data from your CSV file. Unselected locations will be skipped.
                </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 border-b pb-2">
                <Checkbox
                    id="select-all-updates-travel"
                    checked={locationsToUpdate.length > 0 && selectedUpdates.size === locationsToUpdate.length}
                    onCheckedChange={(checked) => {
                        if (checked) {
                            setSelectedUpdates(new Set(locationsToUpdate.map(l => l.existingId)));
                        } else {
                            setSelectedUpdates(new Set());
                        }
                    }}
                />
                <label htmlFor="select-all-updates-travel" className="text-sm font-medium leading-none">
                    Select All
                </label>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                {locationsToUpdate.map(item => (
                    <div key={item.existingId} className="flex items-center space-x-2 p-2 border rounded-md">
                        <Checkbox
                            id={`update-${item.existingId}`}
                            checked={selectedUpdates.has(item.existingId)}
                            onCheckedChange={(checked) => {
                                const newSelection = new Set(selectedUpdates);
                                if (checked) {
                                    newSelection.add(item.existingId);
                                } else {
                                    newSelection.delete(item.existingId);
                                }
                                setSelectedUpdates(newSelection);
                            }}
                        />
                        <label htmlFor={`update-${item.existingId}`} className="text-sm font-medium leading-none">
                            Update "{item.existingTitle}"
                        </label>
                    </div>
                ))}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsUpdateDialogVisible(false)}>Cancel</Button>
                <Button onClick={handleConfirmAndProcessUploads}>
                    Import ({locationsToInsert.length}) & Update ({selectedUpdates.size})
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </div>
  );
};

export default ManageTravel;