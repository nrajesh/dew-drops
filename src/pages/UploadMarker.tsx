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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const locationSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  name: z.string().min(3, { message: "Place name must be at least 3 characters." }),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  blog_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  image: z.any().optional(),
});

const UploadMarker = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const toastId = showLoading("Uploading new location...");
    
    try {
      let { latitude, longitude } = values;

      // Geocode if coordinates are missing but a name is present
      if ((!latitude || !longitude) && values.name) {
        dismissToast(toastId);
        const geocodeToastId = showLoading(`Finding coordinates for ${values.name}...`);
        try {
          const coords = await geocodeLocation(values.name);
          latitude = coords.latitude;
          longitude = coords.longitude;
        } finally {
          dismissToast(geocodeToastId);
        }
      }

      if (!latitude || !longitude) {
        throw new Error("Coordinates are required. Could not automatically find them for the given place name.");
      }

      let imageUrl = null;

      if (values.image && values.image.length > 0) {
        const file = values.image[0];
        const fileName = `${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage.from('map_markers').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('map_markers').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const locationData = {
        title: values.title,
        name: values.name,
        latitude,
        longitude,
        blog_url: values.blog_url || null,
        marker_image_url: imageUrl,
      };

      const { error: insertError } = await supabase.from("travel_locations").insert(locationData);
      if (insertError) throw insertError;

      dismissToast(toastId);
      showSuccess("New location added successfully!");
      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (error: any)
     {
      dismissToast(toastId);
      showError(error.message);
      console.error(error);
    }
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload New Map Marker</CardTitle>
          <CardDescription>
            Add a new location to your travel map. Coordinates are optional and will be auto-detected.
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
                      <Input placeholder="e.g., Summer Vacation in Italy" {...field} />
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
                      <Input placeholder="e.g., Rome, Italy" {...field} />
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
                      <Input placeholder="https://... or /blog/my-trip" {...field} value={field.value ?? ''} />
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
                    <FormLabel>Custom Marker Icon (Optional)</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" {...form.register("image")} ref={fileInputRef} />
                    </FormControl>
                    <FormDescription>
                      Upload an image to use as a custom pin on the map.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Upload Marker</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadMarker;