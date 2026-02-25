import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation, Post } from "@/types";
import { showError, showLoading, updateToastSuccess, updateToastError } from "@/utils/toast";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export const fetchLocations = async (): Promise<TravelLocation[]> => {
  const { data, error } = await supabase.from("travel_locations").select("*").order("created_at", { ascending: false });
  if (error) {
    showError("Failed to fetch locations.");
    console.error(error);
    return [];
  }
  return data as TravelLocation[];
};

export const fetchBlogPosts = async (): Promise<Pick<Post, 'id' | 'title'>[]> => {
  const { data, error } = await supabase.from("posts").select("id, title").order("published_at", { ascending: false });
  if (error) {
    showError("Failed to fetch blog posts for linking.");
    return [];
  }
  return data as Pick<Post, 'id' | 'title'>[];
};

export const geocodeLocation = async (locationName: string): Promise<{ latitude: number; longitude: number }> => {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error("Mapbox access token is not configured. Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file.");
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
};

export const processUploads = async (userId: string, inserts: Partial<TravelLocation>[], updates: { existingId: string, newData: Partial<TravelLocation> }[]): Promise<boolean> => {
  const toastId = showLoading(`Processing import...`);
  try {
    const insertPromises = [];
    if (inserts.length > 0) {
      const insertsWithUserId = inserts.map(item => ({ ...item, user_id: userId }));
      insertPromises.push(supabase.from("travel_locations").insert(insertsWithUserId));
    }

    const updatePromises = updates.map(u =>
      supabase.from("travel_locations").update({ ...u.newData, user_id: userId }).eq('id', u.existingId)
    );

    const results = await Promise.all([...insertPromises, ...updatePromises]);

    for (const result of results) {
      if (result.error) throw new Error(result.error.message);
    }

    updateToastSuccess(toastId, `${inserts.length} new locations added, ${updates.length} locations updated.`);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    updateToastError(toastId, `Import failed: ${err.message}`);
    return false;
  }
};

export const handleBulkDelete = async (locationIds: string[], allLocations: TravelLocation[]): Promise<boolean> => {
  const toastId = showLoading(`Deleting ${locationIds.length} locations...`);
  try {
    const locationsToDelete = allLocations.filter(loc => locationIds.includes(loc.id));
    const imageFilesToDelete = locationsToDelete
      .map(loc => loc.marker_image_url)
      .filter((url): url is string => !!url)
      .map(url => url.substring(url.lastIndexOf('/') + 1));

    if (imageFilesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage.from('mapmarkers').remove(imageFilesToDelete);
      if (storageError) {
        console.error("Could not delete some images from storage:", storageError);
        showError("Could not delete some marker images, but proceeding with location deletion.");
      }
    }

    const { error } = await supabase.from("travel_locations").delete().in("id", locationIds);
    if (error) throw error;

    updateToastSuccess(toastId, `${locationIds.length} locations removed.`);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    updateToastError(toastId, err.message);
    return false;
  }
};

export const handleBulkPublish = async (locationIds: Set<string>, publishStatus: boolean): Promise<boolean> => {
  const toastId = showLoading(`${publishStatus ? "Publishing" : "Unpublishing"} ${locationIds.size} location(s)...`);
  try {
    const { error } = await supabase
      .from("travel_locations")
      .update({ published: publishStatus })
      .in("id", Array.from(locationIds));

    if (error) throw error;

    updateToastSuccess(toastId, `${locationIds.size} location(s) ${publishStatus ? "published" : "unpublished"} successfully.`);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    updateToastError(toastId, `Failed to update status: ${err.message}`);
    return false;
  }
};

export const handleBulkDownload = async (locationIds: Set<string>, allLocations: TravelLocation[], blogPosts: Pick<Post, 'id' | 'title'>[]): Promise<void> => {
  const toastId = showLoading(`Preparing ${locationIds.size} location(s) for download...`);
  try {
    const blogTitleMap = new Map(blogPosts.map(p => [p.id, p.title]));
    const locationsToDownload = allLocations.filter(loc => locationIds.has(loc.id));

    const headers = ["title", "name", "description", "latitude", "longitude", "marker_image_url", "blog_title", "published"];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      if (str.includes('"') || str.includes(';') || str.includes('\n') || str.includes(',')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const csvRows = locationsToDownload.map(loc => {
      const postId = loc.blog_url ? loc.blog_url.split('/').pop() : null;
      const blogTitle = postId ? blogTitleMap.get(postId) || '' : '';

      const rowData = [
        loc.title,
        loc.name,
        loc.description || '',
        loc.latitude,
        loc.longitude,
        loc.marker_image_url || '',
        blogTitle,
        loc.published,
      ];
      return rowData.map(escapeCsv).join(';');
    });

    const csvHeader = headers.map(h => `"${h}"`).join(';');
    const csvContent = [csvHeader, ...csvRows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "travel_locations_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    updateToastSuccess(toastId, `${locationsToDownload.length} location(s) downloaded.`);
  } catch (error: unknown) {
    const err = error as Error;
    updateToastError(toastId, `Download failed: ${err.message}`);
  }
};