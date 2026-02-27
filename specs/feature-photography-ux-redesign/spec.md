# Feature: Photography Management UX Redesign

## Problem Statement

The admin interface for managing blog posts and gallery photos was difficult to use on mobile devices. Three specific pain points were identified:

1. **Blog post creation via modal dialog** — cramped on small screens; the content textarea and cover image selector were barely usable without zooming.
2. **Gallery lightbox swipe navigation** — viewing images in the lightbox on mobile had no swipe gesture support; the only navigation was desktop arrow buttons.
3. **Tag generation was slow and non-obvious** — to add AI-generated tags to an image, the admin had to select images in bulk, trigger a Supabase edge function, and wait for a page reload before seeing the result. There was no per-image inline flow.

## Goals

- Replace the blog post modal with a full-page editor that is comfortable on mobile.
- Add touch swipe navigation (left / right) to the gallery lightbox.
- Enable inline per-image AI tag generation directly inside the image edit dialog.
- Show cover image thumbnails in the blog editor's image picker.
- Improve gallery image list scannability by showing thumbnail previews in the admin table.

## Non-Goals

- Server-side rendering or SSG for the admin pages.
- Replacing the Supabase edge function for tag generation (the inline UX calls the same function; only the trigger point changes).
- Changes to the public gallery page load performance (addressed in a separate feature).

## User Stories

| As | I want to | So that |
|----|-----------|---------|
| Admin (on mobile) | Create and edit blog posts without zooming or squinting | Content creation is comfortable on any device |
| Admin | Navigate between images by swiping in the lightbox | Reviewing photos feels natural on a touchscreen |
| Any user | Open the lightbox and swipe through photos | The gallery is a first-class mobile experience |
| Admin | Click "AI Generate" in the image edit dialog and immediately see tags | I don't have to use slow batch workflows for single images |
| Admin | See a cover image thumbnail when picking an image for a blog post | I can identify the right image without memorising file names |

## Functional Requirements

1. A full-page blog editor (`/manage-blog/new`, `/manage-blog/edit/:id`) with sidebar metadata panel (tags, cover image, publish toggle, publish date, YouTube embed).
2. A searchable `CoverImagePicker` component with thumbnail grid and direct-upload button.
3. YouTube video ID auto-extraction from full URLs (youtube.com/watch, youtu.be, Shorts).
4. Touch `onTouchStart` / `onTouchEnd` handlers on the lightbox image area; 50 px minimum horizontal swipe threshold triggers prev/next.
5. Thumbnail preview (40×56 px) rendered in each row of the gallery admin image list.
6. Bulk action buttons (`flex-1 sm:flex-none`) wrap to full-width on mobile in the gallery management card.
7. An "AI Generate" button (Wand2 icon) inside the image edit dialog, adjacent to the Tags field, that calls `generate-tags-from-url` and populates the tags field for review before saving.

## Non-Functional Requirements

- All changed components must pass `eslint` with zero errors/warnings.
- TypeScript strict type checking (`tsc --noEmit`) must be clean.
- Production build must succeed (`npm run build`).
