import { localDataProvider } from "@/lib/LocalDataProvider";
import type { TravelLocation, Post } from "@/types";
import {
  showError,
  showLoading,
  updateToastSuccess,
  updateToastError,
} from "@/utils/toast";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

/**
 * Fetches locations from local data provider.
 */
export const fetchLocations = async (): Promise<TravelLocation[]> => {
  try {
    return localDataProvider.getTravelLocations();
  } catch (error) {
    showError("Failed to fetch locations (Local).");
    console.error(error);
    return [];
  }
};

/**
 * Fetches blog posts from local data provider for linking.
 */
export const fetchBlogPosts = async (): Promise<
  Pick<Post, "id" | "title">[]
> => {
  try {
    const posts = localDataProvider.getPosts();
    return posts.map((p) => ({ id: p.id, title: p.title }));
  } catch (error) {
    showError("Failed to fetch blog posts for linking (Local).");
    return [];
  }
};

/**
 * Geocodes a location name using Mapbox.
 */
export const geocodeLocation = async (
  locationName: string,
): Promise<{ latitude: number; longitude: number }> => {
  if (!MAPBOX_ACCESS_TOKEN) {
    // Return mock coordinates if Mapbox is not configured
    console.warn("Mapbox token missing; returning mock coordinates.");
    return { latitude: 0, longitude: 0 };
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        locationName,
      )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`,
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      return { latitude, longitude };
    } else {
      throw new Error(`Could not find coordinates for "${locationName}".`);
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    return { latitude: 0, longitude: 0 };
  }
};

/**
 * Simulates processing uploads and insertions.
 */
export const processUploads = async (
  userId: string,
  inserts: Partial<TravelLocation>[],
  updates: { existingId: string; newData: Partial<TravelLocation> }[],
): Promise<boolean> => {
  const toastId = showLoading(`Processing import (Simulation)...`);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    console.log("Simulating travel processing for user:", userId);
    console.log("Inserts:", inserts);
    console.log("Updates:", updates);

    updateToastSuccess(
      toastId,
      `${inserts.length} locations added, ${updates.length} updated (Simulated).`,
    );
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    updateToastError(toastId, `Simulation failed: ${err.message}`);
    return false;
  }
};

/**
 * Simulates bulk deletion.
 */
export const handleBulkDelete = async (
  locationIds: string[],
  _allLocations: TravelLocation[],
): Promise<boolean> => {
  const toastId = showLoading(
    `Deleting ${locationIds.length} locations (Simulation)...`,
  );
  await new Promise((resolve) => setTimeout(resolve, 800));

  try {
    console.log("Simulating deletion of IDs:", locationIds);
    updateToastSuccess(
      toastId,
      `${locationIds.length} locations removed (Simulated).`,
    );
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    updateToastError(toastId, err.message);
    return false;
  }
};

/**
 * Simulates bulk status update.
 */
export const handleBulkPublish = async (
  locationIds: Set<string>,
  publishStatus: boolean,
): Promise<boolean> => {
  const toastId = showLoading(
    `${publishStatus ? "Publishing" : "Unpublishing"} ${locationIds.size} location(s) (Simulation)...`,
  );
  await new Promise((resolve) => setTimeout(resolve, 600));

  try {
    console.log(
      `Simulating status update to ${publishStatus} for:`,
      Array.from(locationIds),
    );
    updateToastSuccess(
      toastId,
      `${locationIds.size} location(s) updated (Simulated).`,
    );
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    updateToastError(toastId, `Failed to update status: ${err.message}`);
    return false;
  }
};

/**
 * Downloads a CSV of selected locations.
 */
export const handleBulkDownload = async (
  locationIds: Set<string>,
  allLocations: TravelLocation[],
  blogPosts: Pick<Post, "id" | "title">[],
): Promise<void> => {
  const toastId = showLoading(
    `Preparing ${locationIds.size} location(s) for download...`,
  );
  try {
    const blogTitleMap = new Map(blogPosts.map((p) => [p.id, p.title]));
    const locationsToDownload = allLocations.filter((loc) =>
      locationIds.has(loc.id),
    );

    const headers = [
      "title",
      "name",
      "description",
      "latitude",
      "longitude",
      "marker_image_url",
      "blog_title",
      "published",
    ];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? "");
      if (
        str.includes('"') ||
        str.includes(";") ||
        str.includes("\n") ||
        str.includes(",")
      ) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const csvRows = locationsToDownload.map((loc) => {
      const postId = loc.blog_url ? loc.blog_url.split("/").pop() : null;
      const blogTitle = postId ? blogTitleMap.get(postId) || "" : "";

      const rowData = [
        loc.title,
        loc.name,
        loc.description || "",
        loc.latitude,
        loc.longitude,
        loc.marker_image_url || "",
        blogTitle,
        loc.published,
      ];
      return rowData.map(escapeCsv).join(";");
    });

    const csvHeader = headers.map((h) => `"${h}"`).join(";");
    const csvContent = [csvHeader, ...csvRows].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "travel_locations_export.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    updateToastSuccess(
      toastId,
      `${locationsToDownload.length} location(s) downloaded.`,
    );
  } catch (error: unknown) {
    const err = error as Error;
    updateToastError(toastId, `Download failed: ${err.message}`);
  }
};
