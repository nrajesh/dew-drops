# Tasks: Photography Management UX Redesign

All tasks are complete. This file is reverse-engineered from the shipped implementation.

## Phase 1: Setup

- [x] Identify all affected components (blog editor, cover picker, lightbox, gallery admin)
- [x] Confirm no new npm dependencies required (Lucide icons already available)

## Phase 2: Blog Editor

- [x] Create `src/pages/BlogEditor.tsx`
  - [x] Implement `editorSchema` with YouTube URL transform
  - [x] Load post data when `id` param present (edit mode)
  - [x] Track `isDirty` state — warn before leaving with unsaved changes
  - [x] Sidebar: publish toggle (Switch), publish date, tags (MultiSelectPopover), cover image, YouTube embed
  - [x] Submit path: creates new post or updates existing via Supabase
- [x] Create `src/components/blog/CoverImagePicker.tsx`
  - [x] Controlled `value` / `onChange` interface
  - [x] Filter by alt_text, file_name, tags — show first 20 matches
  - [x] Close-on-outside-click via `mousedown` listener on `containerRef`
  - [x] Direct upload: sanitize filename → Supabase Storage `gallery` bucket → insert `gallery_images` row → call `onUploaded`
- [x] Register `/manage-blog/new` and `/manage-blog/edit/:id` routes in `App.tsx`

## Phase 3: Gallery Admin UX

- [x] `ImageLightbox.tsx` — add swipe gesture handling
  - [x] `touchStartX` ref: set on `touchstart`, compare on `touchend`
  - [x] ≥50 px delta triggers `onNavigate('next')` or `onNavigate('prev')`
- [x] `ImageListItem.tsx` — add thumbnail, enlarge touch targets
  - [x] Derive thumbnail URL from `image.image_url` or `supabase.storage.getPublicUrl`
  - [x] `h-9 w-9` icon buttons (36 px)
- [x] `ImageManagementCard.tsx` — mobile bulk action buttons
  - [x] `flex-wrap`, `flex-1 sm:flex-none` on Bulk Actions and Delete buttons
- [x] `ManageGallery.tsx` — inline tag generation
  - [x] `isGeneratingTags` state
  - [x] `handleInlineGenerateTags`: create signed URL → invoke edge function → `form.setValue('tags', ...)`
  - [x] Wand2 / Loader2 toggle button in Tags row of edit dialog

## Phase 4: Bug Fix

- [x] `useGalleryManagement.ts` — fix TS2322 on `metadataMap.set` call (add type assertions)

## Phase 5: Verification

- [x] ESLint: 0 warnings on all modified files
- [x] `tsc --noEmit`: clean
- [x] `npm run build`: exit code 0, built in ~16 s
- [x] Commit: `feat(gallery): mobile UX improvements — swipe gestures, thumbnails, inline AI tag generation`
