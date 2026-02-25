# Quickstart: Homepage Cache Refresh

## Overview
This feature adds an automatic recovery mechanism for homepage load failures.

## Test Scenarios

### Scenario 1: Automatic Recovery
1. Open the site in a browser with Service Worker enabled.
2. In the Network tab of DevTools, simulate a failure by blocking one of the main JS bundle requests.
3. Refresh the page.
4. **Expected**: After a 5-second timeout, the page should automatically unregister the SW, clear caches, and reload. On the second load, the blocked resource should be requested again (and hopefully succeed if unblocked).

### Scenario 2: Loop Prevention
1. Force the recovery mechanism to fire (e.g., by keeping the critical resource blocked).
2. **Expected**: The page should reload once. After the reload, it should NOT trigger a second recovery attempt immediately, even if it fails again (check `sessionStorage`).

### Scenario 3: Successful Boot
1. Open the site normally.
2. **Expected**: The React app should clear the failure timeout immediately upon mounting. No recovery should trigger.

## Manual Verification
- Check Console logs for "Cache recovery triggered" or "Cache recovery prevented (already attempted)".
- Verify `sessionStorage.getItem('cache_recovery_attempted')` is set after a recovery event.
