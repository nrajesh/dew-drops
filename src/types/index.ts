// This file defines core application types based on Supabase schema.

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

export interface Post {
  id: string;
  user_id: string | null;
  created_at: string | null;
  title: string;
  description: string | null;
  content: string | null;
  published_at: string | null;
  tags: string[] | null;
  cover_image_id: string | null;
  youtube_video_id: string | null;
  published: boolean;
}

export interface TravelLocation {
  id: string;
  user_id: string | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
  blog_url: string | null;
  created_at: string | null;
  title: string;
  marker_image_url: string | null;
  description: string | null;
  published: boolean;
  blog_title?: string; // Added optional blog_title
}

export interface GalleryImage {
  id: string;
  user_id: string | null;
  alt_text: string | null;
  file_name: string;
  created_at: string | null;
  exif_data: any | null;
  published: boolean;
  tags: string[] | null;
  image_url: string | null;
  tsv: any | null;
  purchase_link: string | null;
}