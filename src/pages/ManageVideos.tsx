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
import { Trash2, Edit, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Video } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
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

const videoSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  youtube_id: z.string().min(11, { message: "Please enter a valid YouTube Video ID." }).max(11),
});

const ManageVideos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  const cancelEdit = () => {
    setEditingId(null);
    form.reset();
  }

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

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const values = line.split(';').map(val => val.trim().replace(/^"|"$/g, ''));
        const entry: { [key: string]: string } = {};
        for (let j = 0; j < headers.length; j++) {
            entry[headers[j]] = values[j] || '';
        }
        data.push(entry);
    }
    return data;
  };

  const handleBulkUpload = async () => {
    if (!uploadFile || !user) return;

    setIsUploading(true);
    const toastId = showLoading("Reading CSV file...");

    try {
      const fileContent = await uploadFile.text();
      const parsedData = parseCsv(fileContent);

      if (parsedData.length === 0) throw new Error("No data rows found in CSV.");

      dismissToast(toastId);
      const progressToastId = showLoading(`Processing ${parsedData.length} rows...`);

      const existingIds = new Set(videos.map(v => v.youtube_id));
      const videosToInsert = [];
      let skippedCount = 0;

      for (const row of parsedData) {
        if (!row.title || !row.youtube_id) continue;
        if (existingIds.has(row.youtube_id)) {
          skippedCount++;
          continue;
        }

        videosToInsert.push({
          title: row.title,
          youtube_id: row.youtube_id,
          user_id: user.id,
        });
        existingIds.add(row.youtube_id);
      }

      dismissToast(progressToastId);

      if (videosToInsert.length > 0) {
        const insertToastId = showLoading(`Uploading ${videosToInsert.length} new videos...`);
        const { error } = await supabase.from("videos").insert(videosToInsert);
        dismissToast(insertToastId);
        if (error) throw new Error(`Database insert failed: ${error.message}`);
        fetchVideos();
      }

      let summary = `${videosToInsert.length} videos uploaded. ${skippedCount} duplicates skipped.`;
      showSuccess(summary);

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
    const toastId = showLoading(`Deleting ${selectedVideos.size} videos...`);
    try {
      const { error } = await supabase.from("videos").delete().in("id", Array.from(selectedVideos));
      if (error) throw error;

      dismissToast(toastId);
      showError(`${selectedVideos.size} videos removed.`);
      fetchVideos();
      setSelectedVideos(new Set());
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  };

  const handleSelectVideo = (id: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedVideos(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedVideos(checked ? new Set(videos.map(v => v.id)) : new Set());
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Videos</CardTitle>
          <CardDescription>Upload a semicolon-separated CSV file to add multiple videos at once.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Headers: <code>"title";"youtube_id"</code></p>
              <Button asChild variant="secondary" size="sm">
                <a href="/sample-videos.csv" download>
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample
                </a>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input type="file" accept=".csv,text/csv" onChange={handleFileSelect} ref={fileInputRef} className="flex-grow" />
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
            <CardTitle>{editingId ? "Edit Video" : "Add New Video"}</CardTitle>
            <CardDescription>{editingId ? "Update the details for this video." : "Enter the details for a new YouTube video."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Title</FormLabel>
                    <FormControl><Input placeholder="e.g., My Awesome Project" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="youtube_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Video ID</FormLabel>
                    <FormControl><Input placeholder="e.g., dQw4w9WgXcQ" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Video List</CardTitle>
                <CardDescription>Your current list of videos.</CardDescription>
              </div>
              {selectedVideos.size > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete ({selectedVideos.size})</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete {selectedVideos.size} selected videos.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setSelectedVideos(new Set())}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center border-b pb-2 mb-2 space-x-3">
              <Checkbox id="select-all" onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={videos.length > 0 && selectedVideos.size === videos.length} disabled={videos.length === 0} />
              <label htmlFor="select-all" className="text-sm font-medium">Select All</label>
            </div>
            <div className="space-y-2 mt-4">
              {videos.length > 0 ? (
                videos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Checkbox id={`select-${video.id}`} checked={selectedVideos.has(video.id)} onCheckedChange={() => handleSelectVideo(video.id)} />
                      <label htmlFor={`select-${video.id}`} className="font-medium truncate pr-2 cursor-pointer">{video.title}</label>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(video)}><Edit className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center pt-4">No videos yet. Add one using the form!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageVideos;