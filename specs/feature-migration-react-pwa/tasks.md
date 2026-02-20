# Implementation Tasks: Redesign to React / PWA

## Phase 1: Setup PWA Dependencies
- [x] Install `vite-plugin-pwa` as a dev dependency.

## Phase 2: Configuration
- [x] Update `vite.config.ts` to import and configure `VitePWA`.
- [x] Define the `manifest` in the PWA plugin (name, short_name, theme_color, background_color, icons).
- [x] Add `registerSW.js` or configure Vite to auto-register the service worker.

## Phase 3: Assets
- [x] Ensure `public/icons/` directory exists.
- [x] Add placeholder icons (192x192, 512x512) for the PWA manifest.
- [x] Update `index.html` to include Apple touch icons and theme color meta tags.

## Phase 4: UI Optimization
- [x] Review main components (e.g. `App.tsx`, `Layout.tsx`) to ensure Shadcn/Tailwind classes are mobile-first (using `md:` and `lg:` appropriately).
- [x] Ensure the UI is lightweight and visually matches a "React Native" feel on mobile (e.g. bottom navigation or simple headers).
