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
import type { Video } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const videoSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  youtube_id: z.string().min(11, { message: "Please enter a valid YouTube Video ID." }).max(11),
});

const ManageVideos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data, error } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (error) {
      showError("Failed to fetch videos.");
      console.error(error);
    } else {
      setVideos(data as Video[]);
    }
  };

  const form = useForm<z.infer<typeof videoSchema>>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: "",
      youtube_id: "",
    },
  });

  async function onSubmit(values: z.infer<typeof videoSchema>) {
    if (!user) {
      showError("You must be logged in to manage videos.");
      return;
    }
    const toastId = showLoading(editingId ? "Updating video..." : "Adding new video...");
    
    const videoData = {
      ...values,
      user_id: user.id,
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase.from("videos").update(videoData).eq("id", editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("videos").insert(videoData);
      error = insertError;
    }

    dismissToast(toastId);
    if (error) {
      showError(error.message);
      console.error(error);
    } else {
      showSuccess(`Video ${editingId ? "updated" : "added"} successfully!`);
      setEditingId(null);
      form.reset();
      fetchVideos();
    }
  }

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    form.setValue("title", video.title);
    form.setValue("youtube_id", video.youtube_id);
  };

  const handleDelete = async (id: string) => {
    const toastId = showLoading("Deleting video...");
    const { error } = await supabase.from("videos").delete().eq("id", id);
    dismissToast(toastId);
    if (error) {
      showError(error.message);
    } else {
      showError("Video removed.");
      fetchVideos();
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
                name="youtube_id"
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
          <CardDescription>Your current list of videos.</CardDescription>
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