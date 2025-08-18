import { Home, Newspaper, Youtube, Image, Map, Bot, Edit, Settings, MapPin, GalleryThumbnails } from "lucide-react";

// Helper function to parse environment variables. Defaults to `defaultValue` if the env var is not set.
const getVisibility = (envVar: string | undefined, defaultValue: boolean): boolean => {
  if (envVar === undefined) {
    return defaultValue;
  }
  return envVar.toLowerCase() === 'true';
};

// To hide a module from the website, set its corresponding environment variable to `false`.
// Example: VITE_NAV_CHATBOT_VISIBLE=false

export const mainNavItems = [
  { to: "/", icon: Home, label: "Home", visible: getVisibility(import.meta.env.VITE_NAV_HOME_VISIBLE, true) },
  { to: "/blog", icon: Newspaper, label: "Blog", visible: getVisibility(import.meta.env.VITE_NAV_BLOG_VISIBLE, true) },
  { to: "/videos", icon: Youtube, label: "Videos", visible: getVisibility(import.meta.env.VITE_NAV_VIDEOS_VISIBLE, true) },
  { to: "/gallery", icon: Image, label: "Gallery", visible: getVisibility(import.meta.env.VITE_NAV_GALLERY_VISIBLE, true) },
  { to: "/travel", icon: Map, label: "Travel", visible: getVisibility(import.meta.env.VITE_NAV_TRAVEL_VISIBLE, true) },
  { to: "/chat", icon: Bot, label: "Chatbot", visible: getVisibility(import.meta.env.VITE_NAV_CHATBOT_VISIBLE, false) },
];

export const managementNavItems = [
  { to: "/manage-blog", icon: Edit, label: "Manage Blog", visible: getVisibility(import.meta.env.VITE_NAV_MANAGE_BLOG_VISIBLE, true) },
  { to: "/manage-videos", icon: Settings, label: "Manage Videos", visible: getVisibility(import.meta.env.VITE_NAV_MANAGE_VIDEOS_VISIBLE, true) },
  { to: "/manage-travel", icon: MapPin, label: "Manage Travel", visible: getVisibility(import.meta.env.VITE_NAV_MANAGE_TRAVEL_VISIBLE, true) },
  { to: "/manage-gallery", icon: GalleryThumbnails, label: "Manage Gallery", visible: getVisibility(import.meta.env.VITE_NAV_MANAGE_GALLERY_VISIBLE, true) },
];