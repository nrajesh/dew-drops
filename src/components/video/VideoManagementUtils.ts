import { supabase } from "@/integrations/supabase/client";
import type { Video } from "@/types";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

export const fetchVideos = async (): Promise<Video[]> => {
  const { data, error } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
  if (error) {
    showError("Failed to fetch videos.");
    console.error(error);
    return [];
  }
  return data as Video[];
};

export const processUploads = async (userId: string, inserts: any[], updates: { existingId: string; newData: any }[]): Promise<boolean> => {
  const toastId = showLoading(`Processing import...`);
  try {
      const insertPromises = [];
      if (inserts.length > 0) {
          const insertsWithUserId = inserts.map(v => ({ ...v, user_id: userId }));
          insertPromises.push(supabase.from("videos").insert(insertsWithUserId));
      }

      const updatePromises = updates.map(u =>
          supabase.from("videos").update({ ...u.newData, user_id: userId }).eq('id', u.existingId)
      );

      const results = await Promise.all([...insertPromises, ...updatePromises]);

      for (const result of results) {
          if (result.error) throw new Error(result.error.message);
      }

      dismissToast(toastId);
      if (inserts.length > 0 || updates.length > 0) {
          showSuccess(`${inserts.length} new videos added, ${updates.length} videos updated.`);
      }
      return true;
  } catch (error: any) {
      dismissToast(toastId);
      showError(`Import failed: ${error.message}`);
      return false;
  }
};

export const handleBulkDelete = async (videoIds: Set<string>): Promise<boolean> => {
  const toastId = showLoading(`Deleting ${videoIds.size} videos...`);
  try {
    const { error } = await supabase.from("videos").delete().in("id", Array.from(videoIds));
    if (error) throw error;

    dismissToast(toastId);
    showError(`${videoIds.size} videos removed.`);
    return true;
  } catch (error: any) {
    dismissToast(toastId);
    showError(error.message);
    return false;
  }
};

export const handleBulkDownload = async (videoIds: Set<string>, allVideos: Video[]): Promise<void> => {
  const toastId = showLoading(`Preparing ${videoIds.size} video(s) for download...`);
  try {
      const videosToDownload = allVideos.filter(video => videoIds.has(video.id));
      const headers = ["title", "youtube_id"];
      
      const escapeCsv = (val: any) => {
          const str = String(val ?? '');
          if (str.includes('"') || str.includes(';') || str.includes('\n') || str.includes(',')) {
              return `"${str.replace(/"/g, '""')}"`;
          }
          return `"${str}"`;
      };

      const csvRows = videosToDownload.map(video => {
          const rowData = [video.title, video.youtube_id];
          return rowData.map(escapeCsv).join(';');
      });

      const csvHeader = headers.map(h => `"${h}"`).join(';');
      const csvContent = [csvHeader, ...csvRows].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "videos_export.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      dismissToast(toastId);
      showSuccess(`${videosToDownload.length} video(s) downloaded.`);
  } catch (error: any) {
      dismissToast(toastId);
      showError(`Download failed: ${error.message}`);
  }
};