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
import { showSuccess, showError } from "@/utils/toast";
import { useState } from "react";
import { Trash2, Edit } from "lucide-react";

const videoSchema = z.object({
  id: z.string().optional(), // Hidden field for editing
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  youtubeId: z.string().min(11, { message: "Please enter a valid YouTube Video ID." }).max(11),
});

const initialVideos = [
  {
    id: "1",
    title: "Building a Portfolio with React & Dyad",
    youtubeId: "dQw4w9WgXcQ",
  },
  {
    id: "2",
    title: "Exploring the Swiss Alps",
    youtubeId: "z_m4_vY_q-M",
  },
  {
    id: "3",
    title: "A Guide to Sourdough Baking",
    youtubeId: "bSYdABrP_44",
  },
];

type Video = z.infer<typeof videoSchema> & { id: string };

const ManageVideos = () => {
  const [videos, setVideos] = useState<Video[]>(initialVideos.map(v => ({...v, id: v.id || String(Math.random())})));
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof videoSchema>>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: "",
      youtubeId: "",
    },
  });

  function onSubmit(values: z.infer<typeof videoSchema>) {
    if (editingId) {
      // Update existing video
      setVideos(videos.map(v => v.id === editingId ? { ...v, ...values } : v));
      showSuccess("Video updated successfully!");
      setEditingId(null);
    } else {
      // Add new video
      const newVideo = { ...values, id: String(Date.now()) };
      setVideos([...videos, newVideo]);
      showSuccess("Video added successfully!");
    }
    form.reset();
  }

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    form.setValue("title", video.title);
    form.setValue("youtubeId", video.youtubeId);
  };

  const handleDelete = (id: string) => {
    setVideos(videos.filter(v => v.id !== id));
    showError("Video removed.");
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    form.reset();
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Video" : "Add New Video"}</CardTitle>
          <CardDescription>
            {editingId ? "Update the details for this video." : "Enter the details for a new YouTube video."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Awesome Project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="youtubeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Video ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., dQw4w9WgXcQ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update Video" : "Add Video"}</Button>
                {editingId && <Button variant="outline" onClick={cancelEdit}>Cancel</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Video List</CardTitle>
          <CardDescription>Your current list of videos. Changes here are not saved permanently.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {videos.length > 0 ? (
              videos.map((video) => (
                <div key={video.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <p className="font-medium truncate pr-2">{video.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(video)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(video.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">No videos yet. Add one using the form!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageVideos;