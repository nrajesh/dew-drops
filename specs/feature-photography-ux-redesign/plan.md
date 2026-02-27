# Plan: Photography Management UX Redesign

## Technical Context

- **Framework**: React 18 + Vite, TypeScript, Tailwind CSS + Shadcn/ui
- **Data**: Supabase (PostgreSQL + Storage + Edge Functions)
- **State**: Local `useState`/`useForm` for admin forms; no global state needed
- **Routing**: React Router v6, protected routes via `ProtectedRoute` wrapper
- **AI**: Gemini via `generate-tags-from-url` Supabase edge function

## Proposed Changes

### Blog Editor (Session 1)

| File | Change |
|------|--------|
| `src/pages/BlogEditor.tsx` | **[NEW]** Full-page editor with 2-column layout (editor left, metadata sidebar right). Handles both create (`/manage-blog/new`) and edit (`/manage-blog/edit/:id`) using `useParams`. |
| `src/components/blog/CoverImagePicker.tsx` | **[NEW]** Searchable image picker; queries `galleryImages` prop by alt_text / file_name / tags. Shows thumbnail grid in popover. Includes direct upload to Supabase Storage. |
| `src/App.tsx` | **[MODIFY]** Register `/manage-blog/new` and `/manage-blog/edit/:id` routes inside the `ProtectedRoute` block, lazy-loading `BlogEditor`. |

**Key design decisions:**
- `BlogEditor` is a standalone page rather than a dialog, eliminating the mobile viewport constraint entirely.
- `CoverImagePicker` is a controlled component (`value`, `onChange`) with an `onUploaded` callback so the parent can update its image list after a direct upload without a full page reload.
- YouTube ID extracted via regex on the raw URL string at form submission time — no separate API call.

### Gallery Admin UX (Session 2)

| File | Change | Why |
|------|--------|-----|
| `src/components/ImageLightbox.tsx` | **[MODIFY]** Add `useRef<number \| null>` for touch tracking + `onTouchStart` / `onTouchEnd` handlers on the image div | Native swipe navigation on mobile |
| `src/components/gallery/ImageListItem.tsx` | **[MODIFY]** Add 40×56 px thumbnail from `image.image_url` (or computed CDN URL); enlarge icon buttons to 36×36 px for touch | Visual scan without opening each image; ergonomic tap targets |
| `src/components/gallery/ImageManagementCard.tsx` | **[MODIFY]** Change button container to `flex-wrap`, add `flex-1 sm:flex-none` to bulk action buttons | Prevents horizontal overflow on mobile |
| `src/pages/ManageGallery.tsx` | **[MODIFY]** Add `isGeneratingTags` state + `handleInlineGenerateTags` function; add "AI Generate" button (Wand2 + Loader2) in edit dialog Tags row | Per-image tag generation with live feedback |
| `src/hooks/useGalleryManagement.ts` | **[MODIFY]** Fix pre-existing TS2322 type error on `metadataMap.set` call | Clean TypeScript |

## Verification Plan

```bash
npx eslint src/pages/BlogEditor.tsx src/components/blog/CoverImagePicker.tsx \
           src/components/ImageLightbox.tsx src/components/gallery/ImageListItem.tsx \
           src/components/gallery/ImageManagementCard.tsx src/pages/ManageGallery.tsx
npx tsc --noEmit
npm run build
```

Expected: `0` lint warnings/errors, TypeScript clean, build exits 0.
