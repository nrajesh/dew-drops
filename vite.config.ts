import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    dyadComponentTagger(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Dew Drops",
        short_name: "DewDrops",
        description: "Portfolio, CV, Photography, and Travelogue",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/icons/pwa-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/icons/pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "/icons/pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      // ── Runtime Caching ────────────────────────────────────────────────────
      // These strategies speed up repeat visits by caching API responses and
      // gallery images in the service worker instead of always hitting the
      // network.
      workbox: {
        runtimeCaching: [
          // 1. Supabase REST API — gallery_images select queries
          //    NetworkFirst: always tries the network first (fresh data),
          //    falls back to cache only when offline.
          //    TTL: 5 minutes — ensures the cache doesn't serve very stale lists.
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname.includes("supabase.co") &&
              url.pathname.includes("/rest/v1/gallery_images"),
            handler: "NetworkFirst" as const,
            options: {
              cacheName: "supabase-api-gallery",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 2. Supabase Storage CDN — gallery image files
          //    CacheFirst: serve from cache immediately on revisit, background
          //    revalidation optional. Gallery images are immutable in practice
          //    (same file_name → same content).
          //    TTL: 1 day — balances freshness vs speed. Deleted/swapped images
          //    will update within 24 h for returning visitors.
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname.includes("supabase.co") &&
              url.pathname.includes("/storage/v1/object/public/gallery"),
            handler: "CacheFirst" as const,
            options: {
              cacheName: "gallery-images-cdn",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
