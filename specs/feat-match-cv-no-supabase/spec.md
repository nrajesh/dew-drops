# Match-CV V2: Vision & Robust Scraping

## Problem Statement
The Match-CV module previously relied on a Supabase Edge Function (`fetch-url-content`) and subsequently a brittle multi-proxy chain to bypass CORS and Cloudflare blocks. Match-CV V2 reworks this into a robust, multimodal entry system that prioritizes reliability and user experience.

## Goals
- **Vision-First Analysis**: Enable users to upload screenshots of job descriptions to bypass scraping issues entirely.
- **Robust Scraping**: Integrate `r.jina.ai` for clean, markdown-formatted text extraction from public URLs.
- **Non-Supabase Integration**: Maintain 100% decoupling from Supabase for this feature.
- **Improved UX**: Add Drag & Drop support and fix mobile layout issues for input selection.

## User Stories
- As a user, I want to upload a screenshot of a job description so that I can match it against my CV even if the website is heavily protected.
- As a user, I want to drag an image file onto the analyst UI for quick upload.
- As a user, I want to paste a URL and have the system reliably extract the core job text.

## Functional Requirements
- **Input Methods**: Support Text Paste, URL Input, and Image Upload (PNG/JPG).
- **Vision Logic**: Gemini 1.5 must analyze images directly when provided, extracting requirements and performing the match in one flow.
- **Jina Scraper**: Use `https://r.jina.ai/{url}` for high-performance extraction.
- **Local Path Warning**: Detect local file paths (e.g., `/Users/`) and guide users to use the Image Upload instead.
- **Report Generation**: Reasoning must include '## Matching Areas' and '## Gaps' (with mitigations) for all input methods.
