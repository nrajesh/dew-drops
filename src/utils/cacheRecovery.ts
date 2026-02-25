/**
 * Checks if recovery has already been attempted in this session to prevent infinite reload loops.
 */
export function shouldAttemptRecovery(): boolean {
  try {
    const attempted = sessionStorage.getItem('cache_recovery_attempted');
    return !attempted;
  } catch (error) {
    // sessionStorage might be disabled or unavailable
    console.warn('Could not access sessionStorage for cache recovery check:', error);
    return false;
  }
}

/**
 * Unregisters all Service Workers and clears all Cache Storage.
 * Then, forces a full page reload from the server.
 */
export async function clearSiteCache() {
  if (!shouldAttemptRecovery()) {
    console.warn('Cache recovery prevented (already attempted this session).');
    return;
  }

  try {
    sessionStorage.setItem('cache_recovery_attempted', 'true');
    console.log('Cache recovery triggered: Clearing Service Workers and Cache Storage...');

    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log(`Unregistered Service Worker: ${registration.scope}`);
      }
    }

    // 2. Clear all cache storage
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
        console.log(`Deleted cache: ${key}`);
      }
    }

    // 3. Force reload from server
    console.log('Reloading page to fetch fresh assets...');
    window.location.reload();
  } catch (error) {
    console.error('Error during cache recovery:', error);
  }
}
