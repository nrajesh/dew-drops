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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useState, useEffect, useRef } from "react";
import { Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation } from "@/types";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const locationSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  name: z.string().min(3, { message: "Place name must be at least 3 characters." }),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  blog_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  image: z.any().optional(),
});

const ManageTravel = () => {
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLocations();
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

  const form = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      title: "",
      name: "",
      latitude: "",
      longitude: "",
      blog_url: "",
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

      const existingLocation = locations.find(l => l.id === editingId);
      let imageUrl = existingLocation?.marker_image_url || null;

      if (values.image && values.image.length > 0) {
        const file = values.image[0];
        const fileName = `${Date.now()}_${file.name}`;

        if (editingId && imageUrl) {
          const oldFileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
          await supabase.storage.from('mapmarkers').remove([oldFileName]);
        }

        const { error: uploadError } = await supabase.storage.from('mapmarkers').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('mapmarkers').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const locationData = {
        title: values.title,
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
        const { error: insertError } = await supabase.from("travel_locations").insert(locationData);
        error = insertError;
      }

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Location ${editingId ? "updated" : "added"} successfully!`);
      cancelEdit();
      fetchLocations();
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
      console.error(error);
    }
  }

  const handleEdit = (location: TravelLocation) => {
    setEditingId(location.id);
    setEditingImageUrl(location.marker_image_url || null);
    form.setValue("title", location.title);
    form.setValue("name", location.name);
    form.setValue("latitude", location.latitude);
    form.setValue("longitude", location.longitude);
    form.setValue("blog_url", location.blog_url || "");
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

  const handleDelete = async (id: string) => {
    const toastId = showLoading("Deleting location...");
    try {
      const locationToDelete = locations.find(l => l.id === id);
      if (locationToDelete?.marker_image_url) {
        const fileName = locationToDelete.marker_image_url.substring(locationToDelete.marker_image_url.lastIndexOf('/') + 1);
        await supabase.storage.from('mapmarkers').remove([fileName]);
      }

      const { error } = await supabase.from("travel_locations").delete().eq("id", id);
      if (error) throw error;

      dismissToast(toastId);
      showError("Location removed.");
      fetchLocations();
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setEditingImageUrl(null);
    form.reset({ title: "", name: "", latitude: "", longitude: "", blog_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
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
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Eiffel Tower Trip" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Paris, France" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Auto-detected" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Auto-detected" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="blog_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blog Post URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="/blog/my-awesome-trip" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {editingId && editingImageUrl && (
                <div className="space-y-2">
                  <FormLabel>Current Marker Image</FormLabel>
                  <div className="flex items-center gap-4">
                    <img src={editingImageUrl} alt="Current marker" className="h-16 w-16 rounded-full object-cover border" />
                    <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage}>Remove Image</Button>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="image"
                render={() => (
                  <FormItem>
                    <FormLabel>{editingImageUrl ? 'Replace Marker Image (Optional)' : 'Custom Marker Image (Optional)'}</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" {...form.register("image")} ref={fileInputRef} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
          <CardTitle>Travel Log</CardTitle>
          <CardDescription>Your current list of visited places.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locations.length > 0 ? (
              locations.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <p className="font-medium truncate pr-2">{location.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(location.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">No locations yet. Add one using the form!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageTravel;