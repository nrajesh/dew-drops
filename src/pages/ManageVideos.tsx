import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"; // Added missing import
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useState, useEffect, useRef, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ManagementPagination } from "@/components/ManagementPagination";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";
import { parseCsv } from "@/utils/csv.ts"; // Added .ts extension
import {
  fetchVideos,
  processUploads,
  handleBulkDelete,
  handleBulkDownload,
} from "@/components/video/VideoManagementUtils.ts"; // Added .ts extension

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
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage, setVideosPerPage] = useState(10);

  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [videosToInsert, setVideosToInsert] = useState<any[]>([]);
  const [videosToUpdate, setVideosToUpdate] = useState<{ existingId: string; existingTitle: string; newData: any }[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    const fetchedVideos = await fetchVideos();
    setVideos(fetchedVideos);
  };

  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * videosPerPage;
    return videos.slice(startIndex, startIndex + videosPerPage);
  }, [videos, currentPage, videosPerPage]);

  const totalPages = Math.ceil(videos.length / videosPerPage);

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
    enabled: !isUpdateDialogVisible,
  });

  const handleItemsPerPageChange = (value: number) => {
    setVideosPerPage(value);
    setCurrentPage(1);
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
      loadVideos();
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

  const handleBulkUpload = async () => {
    if (!uploadFile || !user) return;

    setIsUploading(true);
    const toastId = showLoading("Reading CSV file...");

    try {
      const fileContent = await uploadFile.text();
      const parsedData = parseCsv(fileContent);

      if (parsedData.length === 0) throw new Error("No data rows found in CSV.");

      const existingVideosMap = new Map(videos.map(v => [v.youtube_id, v]));
      const newVideosToInsert: any[] = [];
      const potentialUpdates: { existingId: string; existingTitle: string; newData: any }[] = [];

      for (const row of parsedData) {
        if (!row.title || !row.youtube_id) continue;
        
        const videoData = {
            title: row.title,
            youtube_id: row.youtube_id,
        };

        const existingVideo = existingVideosMap.get(row.youtube_id);

        if (existingVideo) {
            potentialUpdates.push({
                existingId: existingVideo.id,
                existingTitle: existingVideo.title,
                newData: videoData
            });
        } else {
            newVideosToInsert.push(videoData);
        }
      }
      
      dismissToast(toastId);

      setVideosToInsert(newVideosToInsert);
      setVideosToUpdate(potentialUpdates);

      if (potentialUpdates.length > 0) {
          setSelectedUpdates(new Set());
          setIsUpdateDialogVisible(true);
      } else if (newVideosToInsert.length > 0) {
          await processUploads(user.id, newVideosToInsert, []);
          loadVideos();
      } else {
          showSuccess("No new videos to import.");
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

  const handleConfirmAndProcessUploads = async () => {
    if (!user) return;
    setIsUpdateDialogVisible(false);
    
    const updatesToPerform = videosToUpdate.filter(u => selectedUpdates.has(u.existingId));
    const skippedCount = videosToUpdate.length - updatesToPerform.length;

    const success = await processUploads(user.id, videosToInsert, updatesToPerform);

    if (success) {
      if (skippedCount > 0) {
          showError(`${skippedCount} potential updates were skipped.`);
      }
      loadVideos();
    }
    
    setVideosToInsert([]);
    setVideosToUpdate([]);
    setSelectedUpdates(new Set());
  };

  const handleBulkDeleteWrapper = async () => {
    const success = await handleBulkDelete(selectedVideos);
    if (success) {
      loadVideos();
      setSelectedVideos(new Set());
    }
  };

  const handleBulkDownloadWrapper = async () => {
    await handleBulkDownload(selectedVideos, videos);
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
    const pageIds = new Set(paginatedVideos.map(v => v.id));
    if (checked) {
      setSelectedVideos(prev => new Set([...prev, ...pageIds]));
    } else {
      setSelectedVideos(prev => {
        const newSet = new Set(prev);
        pageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  const allOnPageSelected = paginatedVideos.length > 0 && paginatedVideos.every(v => selectedVideos.has(v.id));

  return (
    <div className="space-y-8" ref={containerRef}>
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleBulkDownloadWrapper}>
                    <Download className="h-4 w-4 mr-2" />
                    Download ({selectedVideos.size})
                  </Button>
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
                        <AlertDialogAction onClick={handleBulkDeleteWrapper}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center border-b pb-2 mb-2 space-x-3">
              <Checkbox id="select-all" onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={allOnPageSelected} disabled={paginatedVideos.length === 0} />
              <label htmlFor="select-all" className="text-sm font-medium">Select All</label>
            </div>
            <div className="space-y-2 mt-4">
              {videos.length > 0 ? (
                paginatedVideos.map((video) => (
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
          <CardFooter>
            <ManagementPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={videosPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              totalItems={videos.length}
            />
          </CardFooter>
        </Card>
      </div>
      <Dialog open={isUpdateDialogVisible} onOpenChange={setIsUpdateDialogVisible}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Confirm Updates</DialogTitle>
                <DialogDescription>
                    The following videos already exist (based on YouTube ID). Select the ones you want to update with the data from your CSV.
                </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 border-b pb-2">
                <Checkbox
                    id="select-all-updates-videos"
                    checked={videosToUpdate.length > 0 && selectedUpdates.size === videosToUpdate.length}
                    onCheckedChange={(checked) => {
                        if (checked) {
                            setSelectedUpdates(new Set(videosToUpdate.map(v => v.existingId)));
                        } else {
                            setSelectedUpdates(new Set());
                        }
                    }}
                />
                <label htmlFor="select-all-updates-videos" className="text-sm font-medium leading-none">
                    Select All
                </label>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                {videosToUpdate.map(item => (
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
                    Import ({videosToInsert.length}) & Update ({selectedUpdates.size})
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </div>
  );
};

export default ManageVideos;