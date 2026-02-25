# Research: Homepage Cache Refresh

## 1. Problem Analysis
The "stale cache" issue occurs when the Service Worker (SW) serves an old version of the `index.html` or critical JS chunks that no longer exist on the server (hash mismatch), or when the SW registration itself becomes corrupted. This prevents the React application from bootstrapping.

## 2. Technical Findings

### Detection Mechanism
We can implement a "Dead Man's Switch" in `index.html`:
1.  A script in `<head>` sets a timeout (e.g., 5 seconds).
2.  The React app (in `main.tsx`) clears this timeout upon successful initialization.
3.  If the timeout fires, it signifies a boot failure.
4.  Optionally, we can check for specific errors (e.g., `ChunkLoadError`).

### Cache Clearing Implementation
To reliably clear the cache and Service Worker:
```javascript
async function clearSiteCache() {
  // 1. Unregister all service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
  // 2. Clear all cache storage
  if ('caches' in window) {
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }
  }
  // 3. Force reload from server
  window.location.reload();
}
```

### Integration with `vite-plugin-pwa`
The project uses `registerType: "autoUpdate"`. This means the plugin already tries to update the SW. However, if the page fails to load *before* the plugin can act, our manual trigger is necessary. Our script should be placed *before* the PWA registration script in `index.html` or integrated into the `main.tsx` entry point.

## 3. Decision & Rationale

-   **Decision**: Implement a failure detection script in `index.html` and a recovery function in a new utility file `src/utils/cacheRecovery.ts`.
-   **Rationale**: Placing detection in `index.html` ensures it runs even if the main JS bundle fails to load. The utility file keeps the React code clean.
-   **Alternatives**: 
    -   *Manual user "Refresh" button*: Rejected as it's not transparent and hard for non-technical users.
    -   *Clearing cache on every load*: Rejected as it defeats the purpose of PWA/offline caching.

## 4. Risks & Mitigations
-   **Risk**: Infinite reload loop if the failure is on the server side (e.g., 500 error).
-   **Mitigation**: Use `sessionStorage` to track reload attempts. Only attempt recovery once per session.
