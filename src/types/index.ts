export interface Post {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  content: string | null;
  published_at: string | null;
  user_id: string | null;
  tags: string[] | null;
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
}

export interface Video {
  id: string;
  user_id: string | null;
  title: string;
  youtube_id: string;
  created_at: string;
}