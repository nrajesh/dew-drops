import { Home, Newspaper, Image as ImageIcon, Map, Send, Wrench, ToggleRight, Database, User as UserIcon, Bot, FileText, GitCompare } from "lucide-react";

export const navFeatures = {
  HOME: "home",
  CONTACT: "contact",
  BLOG: "blog",
  GALLERY: "gallery",
  PORTFOLIO: "portfolio",
  TRAVEL: "travel",
  CHATBOT: "chatbot",
  MATCH_CV: "match_cv", // New feature key
  MANAGE_BLOG: "manage_blog",
  MANAGE_GALLERY: "manage_gallery",
  MANAGE_TRAVEL: "manage_travel",
  FEATURE_TOGGLES: "feature_toggles",
};

export const mainNavItems = [
  { to: "/", icon: Home, label: "Home", featureKey: navFeatures.HOME },
  { to: "/blog", icon: Newspaper, label: "Blog", featureKey: navFeatures.BLOG },
  { to: "/gallery", icon: ImageIcon, label: "Gallery", featureKey: navFeatures.GALLERY },
  { to: "/portfolio", icon: FileText, label: "Portfolio", featureKey: navFeatures.PORTFOLIO },
  { to: "/match-cv", icon: GitCompare, label: "Match CV", featureKey: navFeatures.MATCH_CV }, // New navigation item
  { to: "/travel", icon: Map, label: "Travel", featureKey: navFeatures.TRAVEL },
  { to: "/contact", icon: Send, label: "Contact", featureKey: navFeatures.CONTACT },
];

export const managementNavItems = [
  { to: "/manage-blog", icon: Newspaper, label: "Manage Blog", featureKey: navFeatures.MANAGE_BLOG },
  { to: "/manage-gallery", icon: ImageIcon, label: "Manage Gallery", featureKey: navFeatures.MANAGE_GALLERY },
  { to: "/manage-travel", icon: Map, label: "Manage Travel", featureKey: navFeatures.MANAGE_TRAVEL },
  { to: "/feature-toggles", icon: ToggleRight, label: "Feature Toggles", featureKey: navFeatures.FEATURE_TOGGLES },
];

export const settingsNavItems = [
  {
    to: "/manage-data",
    icon: Database,
    label: "Manage Data",
  },
  {
    to: "/manage-chatbot",
    icon: Bot,
    label: "Chatbot Knowledge",
  },
  {
    to: "/profile",
    icon: UserIcon,
    label: "User Profile",
  },
];