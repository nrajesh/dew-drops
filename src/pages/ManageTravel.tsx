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
import { useState, useEffect } from "react";
import { Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation } from "@/types";

const locationSchema = z.object({
  name: z.string().min(3, { message: "Place name must be at least 3 characters." }),
  latitude: z.coerce.number().min(-90, "Latitude must be between -90 and 90.").max(90, "Latitude must be between -90 and 90."),
  longitude: z.coerce.number().min(-180, "Longitude must be between -180 and 180.").max(180, "Longitude must be between -180 and 180."),
  blog_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

const ManageTravel = () => {
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      name: "",
      latitude: 0,
      longitude: 0,
      blog_url: "",
    },
  });

  async function onSubmit(values: z.infer<typeof locationSchema>) {
    const toastId = showLoading(editingId ? "Updating location..." : "Adding new location...");
    
    let error;
    if (editingId) {
      const { error: updateError } = await supabase.from("travel_locations").update(values).eq("id", editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("travel_locations").insert(values);
      error = insertError;
    }

    dismissToast(toastId);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Location ${editingId ? "updated" : "added"} successfully!`);
      setEditingId(null);
      form.reset();
      fetchLocations();
    }
  }

  const handleEdit = (location: TravelLocation) => {
    setEditingId(location.id);
    form.setValue("name", location.name);
    form.setValue("latitude", location.latitude);
    form.setValue("longitude", location.longitude);
    form.setValue("blog_url", location.blog_url || "");
  };

  const handleDelete = async (id: string) => {
    const toastId = showLoading("Deleting location...");
    const { error } = await supabase.from("travel_locations").delete().eq("id", id);
    dismissToast(toastId);
    if (error) {
      showError(error.message);
    } else {
      showError("Location removed.");
      fetchLocations();
    }
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    form.reset();
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Location" : "Add New Location"}</CardTitle>
          <CardDescription>
            {editingId ? "Update the details for this travel location." : "Add a new pin to your travel map."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="e.g., 48.8584" {...field} />
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
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="e.g., 2.2945" {...field} />
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
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locations.length > 0 ? (
              locations.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <p className="font-medium truncate pr-2">{location.name}</p>
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