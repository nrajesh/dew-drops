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
import { showSuccess, showError } from "@/utils/toast";
import { useState } from "react";
import { Trash2, Edit } from "lucide-react";
import { useTravel, travelLocationSchema } from "@/contexts/TravelContext";

const formSchema = travelLocationSchema.omit({ id: true });

const ManageTravel = () => {
  const { locations, addLocation, updateLocation, deleteLocation } = useTravel();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      city: "",
      country: "",
      latitude: 0,
      longitude: 0,
      dateVisited: "",
      description: "",
      blogUrl: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (editingId) {
      updateLocation({ id: editingId, ...values });
      showSuccess("Location updated successfully!");
      setEditingId(null);
    } else {
      addLocation(values);
      showSuccess("Location added successfully!");
    }
    form.reset();
  }

  const handleEdit = (location: z.infer<typeof travelLocationSchema>) => {
    setEditingId(location.id);
    form.setValue("city", location.city);
    form.setValue("country", location.country);
    form.setValue("latitude", location.latitude);
    form.setValue("longitude", location.longitude);
    form.setValue("dateVisited", location.dateVisited || "");
    form.setValue("description", location.description);
    form.setValue("blogUrl", location.blogUrl || "");
  };

  const handleDelete = (id: string) => {
    deleteLocation(id);
    showError("Location removed.");
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
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => ( <FormItem> <FormLabel>City</FormLabel> <FormControl><Input placeholder="e.g., Kyoto" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="country" render={({ field }) => ( <FormItem> <FormLabel>Country</FormLabel> <FormControl><Input placeholder="e.g., Japan" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="latitude" render={({ field }) => ( <FormItem> <FormLabel>Latitude</FormLabel> <FormControl><Input type="number" placeholder="e.g., 35.0116" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="longitude" render={({ field }) => ( <FormItem> <FormLabel>Longitude</FormLabel> <FormControl><Input type="number" placeholder="e.g., 135.7681" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </div>
              <FormField control={form.control} name="dateVisited" render={({ field }) => ( <FormItem> <FormLabel>Date Visited (Optional)</FormLabel> <FormControl><Input placeholder="e.g., April 2023" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea placeholder="What was it like?" className="resize-none" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="blogUrl" render={({ field }) => ( <FormItem> <FormLabel>Blog Post URL (Optional)</FormLabel> <FormControl> <Input placeholder="/blog/my-awesome-trip" {...field} value={field.value ?? ''} /> </FormControl> <FormMessage /> </FormItem> )} />
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
                  <div>
                    <p className="font-medium">{location.city}, {location.country}</p>
                    <p className="text-sm text-muted-foreground">{location.dateVisited}</p>
                  </div>
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