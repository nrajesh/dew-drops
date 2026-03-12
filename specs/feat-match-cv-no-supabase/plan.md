# Implementation Plan: Match-CV V2 (Vision & Robust Scraping)

## Goal Description
The Match-CV module has been upgraded to V2 to solve long-standing reliability issues with URL fetching (403/522 errors) and to support local file paths. This is achieved through a multimodal "Vision-first" strategy and refined scraping.

## Proposed Changes

### Match-CV Module

#### [MODIFY] [CareerFitAnalyst.tsx](file:///Users/nrajesh/Github/dew-drops/src/components/CareerFitAnalyst.tsx)
- **Vision Integration**: Added an "Upload Screenshot" tab supporting PNG/JPG uploads.
- **Drag & Drop**: Implemented file drop support with visual feedback for the upload area.
- **Robust Scraper**: Replaced legacy proxy chains with `r.jina.ai` for clean markdown extraction from URLs.
- **Mobile UX**: Fixed tab layout to wrap on smaller screens and ensure touch-friendly targets.
- **Local Path Warning**: GUIDES users to upload files when a local path (e.g., `/Users/`) is detected.

#### [MODIFY] [jobMatchUtils.ts](file:///Users/nrajesh/Github/dew-drops/src/utils/jobMatchUtils.ts)
- **Multimodal AI**: Updated prompt logic to handle both text and image buffers.
- **Consistent Gaps**: Refined the system prompt to guarantee "Matching Areas" and "Gaps" (with mitigations) are produced for every analysis.

## Verification Plan

### Automated Tests
- `pnpm lint` and `pnpm exec tsc --noEmit` to ensure type safety and code quality.
- `pnpm build` to verify production bundle integrity.

### Manual Verification
1. **Screenshot Upload**: Verify that dragging or selecting a job description screenshot extracts requirements correctly.
2. **Jina Scraping**: Test with an Amazon or LinkedIn URL to confirm 403 blocks are bypassed.
3. **Mobile Layout**: Check the tab navigation on a simulated mobile view to ensure no overlapping text.
4. **Gap Analysis**: Confirm that results always include the "Areas to Bridge" section even for high-match scores.
