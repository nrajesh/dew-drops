# Implementation Plan: Match-CV Alternative Integration

## Goal Description
The Match-CV module currently has the URL fetching functionality disabled, as it previously relied on a Supabase Edge Function (`fetch-url-content`). 
The goal is to re-enabling URL fetching using a free CORS proxy (`api.allorigins.win`) directly from the client. The CV matchmaking itself already leverages a client-side `@google/generative-ai` integration via `sendMessageToGemini`, so we just need to ensure the fetched URL text is passed seamlessly into this existing matching pipeline without depending on any Supabase serverless functions.

## User Review Required
No major architectural changes are required. The free CORS proxy `api.allorigins.win` is suitable for most use cases but might struggle with heavily dynamic Single Page Applications (SPAs). This is a known limitation of client-side proxies without a dedicated backend scraping service.

## Proposed Changes

### Match-CV Module
This component's URL fetching logic needs to be re-activated.

#### [MODIFY] [CareerFitAnalyst.tsx](file:///Users/nrajesh/Github/dew-drops/src/components/CareerFitAnalyst.tsx)
- Re-implement `fetchJobDescriptionFromUrl` to use `fetch(https://api.allorigins.win/raw?url=${encodeURIComponent(url)})`.
- Handle potential errors (e.g., non-200 responses) and throw human-readable errors.
- Ensure the fetched HTML string is passed correctly to the rest of the existing pipeline (`cleanJobDescriptionText`, `analyzeAndTranslateJobDescription`) so that spam validation and language translation are maintained exactly like the paste-text flow.
- Remove the dummy `throw new Error("URL fetching is currently disabled...")` placeholder.

## Verification Plan

### Automated Tests
- `npm run dev` and ensure there are no build, linting, or typescript errors (`pnpm lint`, `pnpm exec tsc --noEmit`).

### Manual Verification
1. Run the local development server.
2. Navigate to the Match Maker page (`/match-cv`).
3. Switch the tab to **Provide URL**.
4. Enter a known public job description URL (e.g., a standard standard job board post or a simple web page).
5. Click **Fetch & Analyze**.
6. Verify that:
   - The text is fetched without CORS errors.
   - The text is mapped properly into the text box.
   - The matching process completes successfully and returns the percentage/reasoning.
