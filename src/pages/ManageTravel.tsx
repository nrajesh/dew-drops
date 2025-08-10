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
import { Trash2, Edit, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";

const locationSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  name: z.string().min(3, { message: "Place name must be at least 3 characters." }),
  blog_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  image: z.any().optional(),
});

const ManageTravel = () => {
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGeocodingConfigured, setIsGeocodingConfigured] = useState(true);
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
      blog_url: "",
    },
  });

  async function onSubmit(values: z.infer<typeof locationSchema>) {
    const toastId = showLoading(editingId ? "Updating location..." : "Adding new location...");
    
    try {
      // Step 1: Geocode the location name
      const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode-location', {
        body: { locationName: values.name },
      });

      if (geoError) {
        const errorBody = await geoError.context.json();
        const errorMessage = errorBody.error || geoError.message;
        if (errorMessage.includes("Missing API Key")) {
          setIsGeocodingConfigured(false);
        }
        throw new Error(errorMessage);
      }

      if (geoData?.error) {
        throw new Error(geoData.error);
      }
      
      if (!geoData) {
        throw new Error("Geocoding failed: No data returned from function.");
      }

      setIsGeocodingConfigured(true);
      const { latitude, longitude } = geoData;

      // Step 2: Handle image upload
      const existingLocation = locations.find(l => l.id === editingId);
      let imageUrl = existingLocation?.marker_image_url || null;

      if (values.image && values.image.length > 0) {
        const file = values.image[0];
        const fileName = `${Date.now()}_${file.name}`;

        if (editingId && imageUrl) {
          const oldFileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
          await supabase.storage.from('map_markers').remove([oldFileName]);
        }

        const { error: uploadError } = await supabase.storage.from('map_markers').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('map_markers').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      // Step 3: Prepare data for Supabase
      const locationData = {
        title: values.title,
        name: values.name,
        latitude,
        longitude,
        blog_url: values.blog_url,
        marker_image_url: imageUrl,
      };

      // Step 4: Insert or update the record
      let dbError;
      if (editingId) {
        const { error: updateError } = await supabase.from("travel_locations").update(locationData).eq("id", editingId);
        dbError = updateError;
      } else {
        const { error: insertError } = await supabase.from("travel_locations").insert(locationData);
        dbError = insertError;
      }

      if (dbError) throw dbError;

      dismissToast(toastId);
      showSuccess(`Location ${editingId ? "updated" : "added"} successfully!`);
      setEditingId(null);
      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchLocations();
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
      console.error(error);
    }
  }

  const handleEdit = (location: TravelLocation) => {
    setEditingId(location.id);
    form.setValue("title", location.title);
    form.setValue("name", location.name);
    form.setValue("blog_url", location.blog_url || "");
  };

  const handleDelete = async (id: string) => {
    const toastId = showLoading("Deleting location...");
    try {
      const locationToDelete = locations.find(l => l.id === id);
      if (locationToDelete?.marker_image_url) {
        const fileName = locationToDelete.marker_image_url.substring(locationToDelete.marker_image_url.lastIndexOf('/') + 1);
        await supabase.storage.from('map_markers').remove([fileName]);
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
    form.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Location" : "Add New Location"}</CardTitle>
          <CardDescription>
            {editingId ? "Update the details for this travel location." : "Add a new pin to your travel map by entering a place name."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isGeocodingConfigured && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Action Required:</strong> The geocoding service is not configured. Please add your Mapbox token as a secret named <code>MAPBOX_ACCESS_TOKEN</code> in your Supabase project settings.
              </AlertDescription>
            </Alert>
          )}
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
              <FormField
                control={form.control}
                name="image"
                render={() => (
                  <FormItem>
                    <FormLabel>Custom Marker Image (Optional)</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" {...form.register("image")} ref={fileInputRef} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update Location" : "Add Location"}</Button>
                {editingId && <Button variant="outline" onClick={cancelEdit}>Cancel</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Travel Log</CardTitle>
          <CardDescription>Your current list of visited places.</CardDescription>
        </Header>
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