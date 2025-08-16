import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError, showLoading, dismissToast, updateToastSuccess, updateToastError } from "@/utils/toast";
import { useState, useEffect, useRef } from "react";
import { Trash2, Edit, Upload, Download, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation, Post } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { sanitizeFileName } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const locationSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().max(500, { message: "Description cannot be more than 500 characters." }).optional(),
  name: z.string().min(3, { message: "Place name must be at least 3 characters." }),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  blog_url: z.string().optional().nullable(),
  image: z.instanceof(FileList).optional(),
});

const ManageTravel = () => {
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [blogPosts, setBlogPosts] = useState<Pick<Post, 'id' | 'title'>[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [blogPopoverOpen, setBlogPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for the update confirmation dialog
  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [locationsToInsert, setLocationsToInsert] = useState<any[]>([]);
  const [locationsToUpdate, setLocationsToUpdate] = useState<{ existingId: string; existingTitle: string; newData: any }[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLocations();
    fetchBlogPosts();
  }, []);

  const fetchLocations = async () => {
    const { data, error } = await supabase.from("travel_locations").select("*").order("created_at", { ascending: false });
    if (error) {
      showError("Failed to fetch locations.");
      console.error(error);
    } else {
      setLocations(data as TravelLocation[]);
    }
  };

  const fetchBlogPosts = async () => {
    const { data, error } = await supabase.from("posts").select("id, title").order("published_at", { ascending: false });
    if (error) {
      showError("Failed to fetch blog posts for linking.");
    } else {
      setBlogPosts(data as Pick<Post, 'id' | 'title'>[]);
    }
  };

  const form = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      title: "",
      description: "",
      name: "",
      latitude: "",
      longitude: "",
      blog_url: null,
    },
  });

  async function geocodeLocation(locationName: string) {
    if (!MAPBOX_ACCESS_TOKEN) {
      throw new Error("Mapbox access token is not configured.");
    }
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        locationName
      )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      return { latitude, longitude };
    } else {
      throw new Error(`Could not find coordinates for "${locationName}". Please provide them manually or check the spelling.`);
    }
  }

  async function onSubmit(values: z.infer<typeof locationSchema>) {
    const toastId = showLoading(editingId ? "Updating location..." : "Adding new location...");
    
    try {
      let { latitude, longitude } = values;

      if ((!latitude || !longitude) && values.name) {
        const geocodeToastId = showLoading(`Finding coordinates for ${values.name}...`);
        try {
          const coords = await geocodeLocation(values.name);
          latitude = coords.latitude;
          longitude = coords.longitude;
          form.setValue('latitude', coords.latitude);
          form.setValue('longitude', coords.longitude);
        } finally {
          dismissToast(geocodeToastId);
        }
      }

      if (!latitude || !longitude) {
        throw new Error("Coordinates are required. Could not automatically find them for the given place name.");
      }

      if (!editingId) {
        const isDuplicate = locations.some(loc => 
          loc.name.toLowerCase() === values.name.toLowerCase() ||
          (loc.latitude === latitude && loc.longitude === longitude)
        );
        if (isDuplicate) {
          throw new Error("A location with the same name or coordinates already exists.");
        }
      }

      const existingLocation = locations.find(l => l.id === editingId);
      let imageUrl = existingLocation?.marker_image_url || null;

      if (values.image && values.image.length > 0) {
        const file = values.image[0];
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${Date.now()}_${sanitizedName}`;

        if (editingId && imageUrl) {
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
        latitude,
        longitude,
        blog_url: values.blog_url,
        marker_image_url: imageUrl,
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase.from("travel_locations").update(locationData).eq("id", editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("travel_locations").insert([locationData]);
        error = insertError;
      }

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Location ${editingId ? "updated" : "added"} successfully!`);
      cancelEdit();
      fetchLocations();
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Operation failed: ${error.message}`);
    }
  };

  const handleEdit = (location: TravelLocation) => {
    setEditingId(location.id);
    setEditingImageUrl(location.marker_image_url || null);
    form.reset({
      title: location.title,
      description: location.description || "",
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      blog_url: location.blog_url || null,
    });
  };

  const handleRemoveImage = async () => {
    if (!editingId || !editingImageUrl) return;

    const toastId = showLoading("Removing image...");
    try {
      const fileName = editingImageUrl.substring(editingImageUrl.lastIndexOf('/') + 1);
      const { error: removeError } = await supabase.storage.from('mapmarkers').remove([fileName]);
      if (removeError) throw removeError;

      const { error: updateError } = await supabase.from("travel_locations").update({ marker_image_url: null }).eq("id", editingId);
      if (updateError) throw updateError;
      
      dismissToast(toastId);
      showSuccess("Image removed successfully.");
      setEditingImageUrl(null);
      fetchLocations();
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setEditingImageUrl(null);
    form.reset({
      title: "",
      description: "",
      name: "",
      latitude: "",
      longitude: "",
      blog_url: null,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    } else {
      setUploadFile(null);
    }
  };

  const parseCsv = (csvText: string): any[] => {
    const lines = csvText.trim().split(/\r\n|\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    const csvRowRegex = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const values = line.split(csvRowRegex).map(val => {
            let value = val.trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            return value.replace(/""/g, '"');
        });

        const entry: { [key: string]: string } = {};
        for (let j = 0; j < headers.length; j++) {
            entry[headers[j]] = values[j] || '';
        }
        data.push(entry);
    }
    return data;
  };

  const processUploads = async (inserts: any[], updates: {existingId: string, newData: any}[]) => {
    const toastId = showLoading(`Processing import...`);
    try {
        const insertPromises = [];
        if (inserts.length > 0) {
            insertPromises.push(supabase.from("travel_locations").insert(inserts));
        }

        const updatePromises = updates.map(u => 
            supabase.from("travel_locations").update(u.newData).eq('id', u.existingId)
        );

        const results = await Promise.all([...insertPromises, ...updatePromises]);

        for (const result of results) {
            if (result.error) {
                throw new Error(result.error.message);
            }
        }
        
        dismissToast(toastId);
        if (inserts.length > 0 || updates.length > 0) {
          showSuccess(`${inserts.length} new locations added, ${updates.length} locations updated.`);
        }
        fetchLocations();

    } catch (error: any) {
        dismissToast(toastId);
        showError(`Import failed: ${error.message}`);
    }
  };

  const handleConfirmAndProcessUploads = async () => {
    setIsUpdateDialogVisible(false);
    
    const updatesToPerform = locationsToUpdate.filter(u => selectedUpdates.has(u.existingId)).map(u => ({
        existingId: u.existingId,
        newData: u.newData
    }));

    const skippedCount = locationsToUpdate.length - updatesToPerform.length;

    await processUploads(locationsToInsert, updatesToPerform);

    if (skippedCount > 0) {
        showError(`${skippedCount} potential updates were skipped.`);
    }
    
    setLocationsToInsert([]);
    setLocationsToUpdate([]);
    setSelectedUpdates(new Set());
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) return;

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

          let { latitude, longitude } = row;
          if ((!latitude || !longitude) && row.name) {
            const coords = await geocodeLocation(row.name);
            latitude = coords.latitude;
            longitude = coords.longitude;
          }
          if (!latitude || !longitude) throw new Error(`Could not determine coordinates for "${row.name}".`);

          let blog_url = null;
          if (row.blog_title) {
            const postId = blogTitleMap.get(row.blog_title.toLowerCase());
            if (postId) blog_url = `/blog/${postId}`;
          }

          const locationData = {
            title: row.title,
            name: row.name,
            description: row.description || null,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            blog_url: blog_url,
            marker_image_url: row.marker_image_url || null,
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
        await processUploads(newLocations, []);
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

  const handleBulkDelete = async () => {
    const toastId = showLoading(`Deleting ${selectedLocations.size} locations...`);
    try {
        const selectedIds = Array.from(selectedLocations);

        const locationsToDelete = locations.filter(loc => selectedIds.includes(loc.id));
        const imageFilesToDelete = locationsToDelete
            .map(loc => loc.marker_image_url)
            .filter((url): url is string => !!url)
            .map(url => url.substring(url.lastIndexOf('/') + 1));

        if (imageFilesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage.from('mapmarkers').remove(imageFilesToDelete);
            if (storageError) {
                console.error("Could not delete some images from storage:", storageError);
                showError("Could not delete some marker images, but proceeding with location deletion.");
            }
        }

        const { error } = await supabase.from("travel_locations").delete().in("id", selectedIds);
        if (error) throw error;

        dismissToast(toastId);
        showError(`${selectedLocations.size} locations removed.`);
        fetchLocations();
        setSelectedLocations(new Set());
    } catch (error: any) {
        dismissToast(toastId);
        showError(error.message);
    }
  };

  const handleBulkDownload = async () => {
    const toastId = showLoading(`Preparing ${selectedLocations.size} location(s) for download...`);
    try {
        const blogTitleMap = new Map(blogPosts.map(p => [p.id, p.title]));
        const locationsToDownload = locations.filter(loc => selectedLocations.has(loc.id));

        const headers = ["title", "name", "description", "latitude", "longitude", "marker_image_url", "blog_title"];
        
        const escapeCsv = (val: any) => {
            const str = String(val);
            if (str.includes('"') || str.includes(';') || str.includes('\n') || str.includes(',')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return `"${str}"`;
        };

        const csvRows = locationsToDownload.map(loc => {
            const postId = loc.blog_url ? loc.blog_url.split('/').pop() : null;
            const blogTitle = postId ? blogTitleMap.get(postId) || '' : '';

            const rowData = [
                loc.title,
                loc.name,
                loc.description || '',
                loc.latitude,
                loc.longitude,
                loc.marker_image_url || '',
                blogTitle,
            ];
            return rowData.map(escapeCsv).join(';');
        });

        const csvHeader = headers.map(h => `"${h}"`).join(';');
        const csvContent = [csvHeader, ...csvRows].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "travel_locations_export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        updateToastSuccess(toastId, `${locationsToDownload.length} location(s) downloaded.`);

    } catch (error: any) {
        updateToastError(toastId, `Download failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-8">
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
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Location" : "Add New Location"}</CardTitle>
            <CardDescription>
              {editingId ? "Update the details for this travel location." : "Add a new pin to your travel map. Coordinates are optional."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Eiffel Tower Trip" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="A short description of your visit." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Place Name</FormLabel><FormControl><Input placeholder="e.g., Paris, France" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="latitude" render={({ field }) => (
                    <FormItem><FormLabel>Latitude (Optional)</FormLabel><FormControl><Input type="number" step="any" placeholder="Auto-detected" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="longitude" render={({ field }) => (
                    <FormItem><FormLabel>Longitude (Optional)</FormLabel><FormControl><Input type="number" step="any" placeholder="Auto-detected" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>
                <FormField control={form.control} name="blog_url" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Linked Blog Post (Optional)</FormLabel>
                    <Popover open={blogPopoverOpen} onOpenChange={setBlogPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                            <span className="truncate">
                              {field.value ? blogPosts.find(post => `/blog/${post.id}` === field.value)?.title : "Select a blog post"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                        <Command>
                          <CommandInput placeholder="Search posts..." />
                          <CommandList>
                            <CommandEmpty>No posts found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem value="--none--" onSelect={() => {
                                field.onChange(null);
                                setBlogPopoverOpen(false);
                              }}>
                                <Check className={cn("mr-2 h-4 w-4", field.value === null ? "opacity-100" : "opacity-0")} />
                                None
                              </CommandItem>
                              {blogPosts.map((post) => (
                                <CommandItem value={post.title} key={post.id} onSelect={() => {
                                  field.onChange(`/blog/${post.id}`);
                                  setBlogPopoverOpen(false);
                                }}>
                                  <Check className={cn("mr-2 h-4 w-4", `/blog/${post.id}` === field.value ? "opacity-100" : "opacity-0")}/>
                                  {post.title}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}/>
                
                {editingId && editingImageUrl && (
                  <div className="space-y-2">
                    <FormLabel>Current Marker Image</FormLabel>
                    <div className="flex items-center gap-4">
                      <img src={editingImageUrl} alt="Current marker" className="h-16 w-16 rounded-full object-cover border" />
                      <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage}>Remove Image</Button>
                    </div>
                  </div>
                )}

                <FormField control={form.control} name="image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingImageUrl ? 'Replace Marker Image (Optional)' : 'Custom Marker Image (Optional)'}</FormLabel>
                    <FormControl><Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="flex gap-2">
                  <Button type="submit">{editingId ? "Update Location" : "Add Location"}</Button>
                  {editingId && <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Travel Log</CardTitle>
                <CardDescription>Your current list of visited places.</CardDescription>
              </div>
              {selectedLocations.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleBulkDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download ({selectedLocations.size})
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete ({selectedLocations.size})</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete {selectedLocations.size} selected locations and any associated images.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel onClick={() => setSelectedLocations(new Set())}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Continue</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center border-b pb-2 mb-2 space-x-3">
              <Checkbox id="select-all" onCheckedChange={(checked) => { const newSelected = new Set<string>(); if (checked) { locations.forEach(loc => newSelected.add(loc.id)); } setSelectedLocations(newSelected); }} checked={locations.length > 0 && selectedLocations.size === locations.length} disabled={locations.length === 0}/>
              <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Select All</label>
            </div>
            <div className="space-y-2 mt-4">
              {locations.length > 0 ? (
                locations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Checkbox id={`select-${location.id}`} checked={selectedLocations.has(location.id)} onCheckedChange={() => { const newSelected = new Set(selectedLocations); if (newSelected.has(location.id)) { newSelected.delete(location.id); } else { newSelected.add(location.id); } setSelectedLocations(newSelected); }}/>
                      <label htmlFor={`select-${location.id}`} className="font-medium truncate pr-2 cursor-pointer">{location.title}</label>
                    </div>
                    <div className="flex items-center gap-2 shrink-0"><Button variant="ghost" size="icon" onClick={() => handleEdit(location)}><Edit className="h-4 w-4" /></Button></div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center pt-4">No locations yet. Add one using the form!</p>
              )}
            </div>
          </CardContent>
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