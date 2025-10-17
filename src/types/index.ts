export interface GalleryImage {
  id: string;
  user_id: string;
  alt_text: string | null;
  file_name: string;
  created_at: string;
  exif_data: any | null;
  published: boolean;
  tags: string[] | null;
  image_url: string | null;
  tsv: string | null;
}

export interface Post {
  id: string;
  user_id: string | null;
  created_at: string;
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
  created_at: string;
  title: string;
  marker_image_url: string | null;
  description: string | null;
  published: boolean;
  blog_title?: string; // Added blog_title for display purposes
}

export interface ChatbotKnowledge {
  id: number;
  content: string | null;
  updated_at: string | null;
  user_id: string | null;
  source_id: string | null;
  source_type: string | null;
}

export interface FeatureToggle {
  id: string;
  user_id: string;
  feature_key: string;
  is_enabled: boolean;
  created_at: string;
  auto_disabled_until: string | null;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}