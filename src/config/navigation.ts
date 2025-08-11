import { Home, Newspaper, Youtube, Image, Map, Bot, Edit, Settings, MapPin, GalleryThumbnails } from "lucide-react";

// To hide a module from the website, set its `visible` property to `false`.
// This will remove it from the navigation sidebar and disable its page route.

export const mainNavItems = [
  { to: "/", icon: Home, label: "Home", visible: true },
  { to: "/blog", icon: Newspaper, label: "Blog", visible: true },
  { to: "/videos", icon: Youtube, label: "Videos", visible: true },
  { to: "/gallery", icon: Image, label: "Gallery", visible: true },
  { to: "/travel", icon: Map, label: "Travel", visible: true },
  { to: "/chat", icon: Bot, label: "Chatbot", visible: false },
];

export const managementNavItems = [
  { to: "/manage-blog", icon: Edit, label: "Manage Blog", visible: false },
  { to: "/manage-videos", icon: Settings, label: "Manage Videos", visible: true },
  { to: "/manage-travel", icon: MapPin, label: "Manage Travel", visible: true },
  { to: "/manage-gallery", icon: GalleryThumbnails, label: "Manage Gallery", visible: true },
];