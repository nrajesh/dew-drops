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
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TravelLocation, Post } from "@/types";
import { useEffect, useState } from "react";

const locationSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().max(500, { message: "Description cannot be more than 500 characters." }).optional(),
  name: z.string().min(3, { message: "Place name must be at least 3 characters." }),
  latitude: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({ invalid_type_error: "Must be a number" }).min(-90).max(90).optional()
  ),
  longitude: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({ invalid_type_error: "Must be a number" }).min(-180).max(180).optional()
  ),
  blog_url: z.string().optional().nullable(),
  image: z.instanceof(FileList).optional(),
  published: z.boolean().default(false),
});

export type LocationFormData = z.infer<typeof locationSchema>;

interface TravelLocationFormProps {
  editingLocation: TravelLocation | null;
  editingImageUrl: string | null;
  blogPosts: Pick<Post, 'id' | 'title'>[];
  onSubmit: (values: LocationFormData) => void;
  onCancel: () => void;
  onRemoveImage: () => void;
}

export const TravelLocationForm = ({
  editingLocation,
  editingImageUrl,
  blogPosts,
  onSubmit,
  onCancel,
  onRemoveImage,
}: TravelLocationFormProps) => {
  const [blogPopoverOpen, setBlogPopoverOpen] = useState(false);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      title: "",
      description: "",
      name: "",
      latitude: undefined,
      longitude: undefined,
      blog_url: null,
      published: false,
    },
  });

  useEffect(() => {
    if (editingLocation) {
      form.reset({
        title: editingLocation.title,
        description: editingLocation.description || "",
        name: editingLocation.name,
        latitude: editingLocation.latitude,
        longitude: editingLocation.longitude,
        blog_url: editingLocation.blog_url || null,
        published: editingLocation.published,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        name: "",
        latitude: undefined,
        longitude: undefined,
        blog_url: null,
        published: false,
      });
    }
  }, [editingLocation, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingLocation ? "Edit Location" : "Add New Location"}</CardTitle>
        <CardDescription>
          {editingLocation ? "Update the details for this travel location." : "Add a new pin to your travel map. Coordinates are optional."}
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
                <FormItem><FormLabel>Latitude (Optional)</FormLabel><FormControl><Input type="number" step="any" placeholder="Auto-detected" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="longitude" render={({ field }) => (
                <FormItem><FormLabel>Longitude (Optional)</FormLabel><FormControl><Input type="number" step="any" placeholder="Auto-detected" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
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
            
            {editingLocation && editingImageUrl && (
              <div className="space-y-2">
                <FormLabel>Current Marker Image</FormLabel>
                <div className="flex items-center gap-4">
                  <img src={editingImageUrl} alt="Current marker" className="h-16 w-16 rounded-full object-cover border" />
                  <Button type="button" variant="outline" size="sm" onClick={onRemoveImage}>Remove Image</Button>
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
            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Published</FormLabel>
                    <FormMessage />
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit">{editingLocation ? "Update Location" : "Add Location"}</Button>
              {editingLocation && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};