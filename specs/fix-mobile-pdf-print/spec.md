# Fix Mobile Browser "Print to PDF" for Career Fit Analyst

## Problem Statement

The Career Fit Analyst's "Download as PDF" button triggers `window.print()` via a hidden iframe (`pdfGenerator.ts`). This works well on **desktop browsers**, which open a print dialog rendering the injected HTML as a clean, structured PDF.

On **mobile browsers** (iOS Safari, Chrome for Android), this approach fails:
- Mobile Safari intercepts `window.print()` and opens its native print sheet, which prints the **current visible page** rather than the structured HTML in the hidden iframe.
- The result is an unstructured, raw page dump instead of the formatted Career Fit Analysis report.

## Goals

- On mobile, generate the same structured PDF content (Job Highlights, Matching Areas, Areas to Bridge) that the desktop PDF produces.
- Provide a seamless download experience on mobile without relying on `window.print()`.
- Keep the desktop `window.print()` flow unchanged (it already works correctly).

## Non-Goals

- Adding a third-party PDF library (e.g. jsPDF, html2pdf.js). The structured HTML is already well-formed; we just need a delivery mechanism.
- Changing the content/layout of the PDF template itself.
- Fixing the CV page's "Print to PDF" button (separate feature; uses a different flow).

## User Stories

1. **As a mobile visitor**, when I tap "Download as PDF" on a Career Fit result, I receive a downloadable HTML file that I can open, share, or save — with the same structured layout as the desktop PDF.
2. **As a desktop visitor**, the existing `window.print()` PDF flow continues to work unchanged.

## Functional Requirements

- Detect mobile browsers and use a Blob-based download for PDF content instead of `window.print()`.
- The downloaded file should be a self-contained `.html` file with all styles inlined, viewable in any browser and easily convertible to PDF via the OS share sheet.
- Reuse the existing rich HTML template from `CareerFitAnalyst.tsx` `handleDownloadPdf`.

## Non-Functional Requirements

- No new dependencies.
- Minimal code changes — limited to `pdfGenerator.ts` and minor adjustments in `CareerFitAnalyst.tsx`.
