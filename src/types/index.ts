export interface Post {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  content: string | null;
  published_at: string | null;
  user_id: string | null;
  tags: string[] | null;
  cover_image_id: string | null;
  youtube_video_id: string | null;
  published: boolean;
}

export interface TravelLocation {
  id: string;
  created_at: string;
  title: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  blog_url: string | null;
  blog_title?: string; // Added for map popups
  marker_image_url: string | null;
  user_id: string | null;
}

export interface GalleryImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  file_name: string;
  created_at: string;
  user_id: string | null;
  exif_data: Record<string, any> | null;
  embedding: number[] | null; // Added for vector search
}

export interface Video {
  id: string;
  user_id: string | null;
  title: string;
  youtube_id: string;
  created_at: string;
}