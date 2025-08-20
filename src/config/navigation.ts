import { Home, Newspaper, Youtube, Image, Map, Edit, Settings, MapPin, GalleryThumbnails, ToggleRight, MessageSquare } from "lucide-react";

// These keys must match the `feature_key` column in the `feature_toggles` table.
export const navFeatures = {
  HOME: 'nav_home',
  BLOG: 'nav_blog',
  GALLERY: 'nav_gallery',
  TRAVEL: 'nav_travel',
  VIDEOS: 'nav_videos',
  CHATBOT: 'nav_chatbot',
  YOUTUBE_SEARCH: 'youtube_search', // New feature toggle for YouTube search
  MANAGE_BLOG: 'manage_blog',
  MANAGE_GALLERY: 'manage_gallery',
  MANAGE_TRAVEL: 'manage_travel',
  MANAGE_VIDEOS: 'manage_videos',
  FEATURE_TOGGLES: 'manage_feature_toggles',
};

export const mainNavItems = [
  { to: "/", icon: Home, label: "Home", featureKey: navFeatures.HOME },
  { to: "/blog", icon: Newspaper, label: "Blog", featureKey: navFeatures.BLOG },
  { to: "/gallery", icon: Image, label: "Gallery", featureKey: navFeatures.GALLERY },
  { to: "/travel", icon: Map, label: "Travel", featureKey: navFeatures.TRAVEL },
  { to: "/videos", icon: Youtube, label: "Videos", featureKey: navFeatures.VIDEOS },
];

export const managementNavItems = [
  { to: "/manage-blog", icon: Edit, label: "Manage Blog", featureKey: navFeatures.MANAGE_BLOG },
  { to: "/manage-gallery", icon: GalleryThumbnails, label: "Manage Gallery", featureKey: navFeatures.MANAGE_GALLERY },
  { to: "/manage-travel", icon: MapPin, label: "Manage Travel", featureKey: navFeatures.MANAGE_TRAVEL },
  { to: "/manage-videos", icon: Settings, label: "Manage Videos", featureKey: navFeatures.MANAGE_VIDEOS },
  { to: "/feature-toggles", icon: ToggleRight, label: "Feature Toggles", featureKey: navFeatures.FEATURE_TOGGLES },
];