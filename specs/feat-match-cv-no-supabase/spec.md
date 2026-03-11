# Match-CV: Alternative URL Fetching Integration

## Problem Statement
The Match-CV module currently has the URL fetching functionality disabled. Previously, this relied on a Supabase Edge Function (`fetch-url-content`) to bypass CORS restrictions. The goal is to re-enable "URL fetching" and subsequently CV matchmaking without relying on Supabase integrations.

## Goals
- Re-enable the ability for users to provide a URL for a job description.
- Fetch the job description content directly from the client without running into CORS issues.
- Maintain the existing Gemini-based CV matchmaking flow.
- Remove any dependency on Supabase Edge Functions for this specific feature.

## Non-Goals
- Changing the Gemini AI matching logic or prompt structure.
- Modifying the UI beyond re-enabling the URL fetch inputs and flows.

## User Stories
- As a user, I want to paste a URL of a job description so that the system automatically fetches the text instead of me manually copy-pasting it.
- As a user, I want the system to seamlessly evaluate the fetched job description against the portfolio.

## Functional Requirements
- The system must accept a valid HTTP/HTTPS URL.
- The system must attempt to fetch the text content from the provided URL using a CORS proxy (e.g., `api.allorigins.win`).
- Upon successful fetch, the text must be cleaned and passed to the existing Gemini matching workflow.
- If fetching fails, the system must display an appropriate error toast to the user.

## Non-Functional Requirements
- **Performance**: URL text retrieval should ideally take less than 5 seconds.
- **Reliability**: The proxy solution must handle basic static sites effectively (CSR sites might return empty body, but that is a known limitation of simple proxies).
