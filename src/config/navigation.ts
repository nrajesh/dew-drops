import { Home, Newspaper, Image, Map, Edit, Settings, MapPin, GalleryThumbnails, ToggleRight } from "lucide-react";

// These keys must match the `feature_key` column in the `feature_toggles` table.
export const navFeatures = {
  HOME: 'nav_home',
  BLOG: 'nav_blog',
  GALLERY: 'nav_gallery',
  TRAVEL: 'nav_travel',
  CHATBOT: 'nav_chatbot',
  MANAGE_BLOG: 'manage_blog',
  MANAGE_GALLERY: 'manage_gallery',
  MANAGE_TRAVEL: 'manage_travel',
  FEATURE_TOGGLES: 'manage_feature_toggles',
};

export const mainNavItems = [
  { to: "/", icon: Home, label: "Home", featureKey: navFeatures.HOME },
  { to: "/blog", icon: Newspaper, label: "Blog", featureKey: navFeatures.BLOG },
  { to: "/gallery", icon: Image, label: "Gallery", featureKey: navFeatures.GALLERY },
  { to: "/travel", icon: Map, label: "Travel", featureKey: navFeatures.TRAVEL },
];

export const managementNavItems = [
  { to: "/manage-blog", icon: Edit, label: "Manage Blog", featureKey: navFeatures.MANAGE_BLOG },
  { to: "/manage-gallery", icon: GalleryThumbnails, label: "Manage Gallery", featureKey: navFeatures.MANAGE_GALLERY },
  { to: "/manage-travel", icon: MapPin, label: "Manage Travel", featureKey: navFeatures.MANAGE_TRAVEL },
  { to: "/feature-toggles", icon: ToggleRight, label: "Feature Toggles", featureKey: navFeatures.FEATURE_TOGGLES },
];