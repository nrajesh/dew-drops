# Tasks: Homepage Cache Refresh

## [X] T001: Create Cache Recovery Utility
- **File**: `src/utils/cacheRecovery.ts`
- **Description**: Implement `clearSiteCache()` function that unregisters SWs and clears Cache Storage.
- **Dependencies**: None

## [X] T002: Implement Loop Prevention Logic
- **File**: `src/utils/cacheRecovery.ts`
- **Description**: Add `shouldAttemptRecovery()` using `sessionStorage` to prevent infinite reload loops.
- **Dependencies**: T001

## [X] T003: Add Detection Script to index.html
- **File**: `index.html`
- **Description**: Add a small inline script in `<head>` that starts a timeout and calls the recovery utility if not cleared.
- **Dependencies**: T002

## [X] T004: Clear Failure Timeout in React App
- **File**: `src/main.tsx`
- **Description**: Call a cleanup function to cancel the failure timeout as soon as the app successfully starts.
- **Dependencies**: T003

## [X] T005: Manual Verification [P]
- **Description**: Verify the recovery mechanism works as expected using the scenarios in `quickstart.md`.
- **Dependencies**: T004
