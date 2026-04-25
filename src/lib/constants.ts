/** Background reconciliation poll interval (30 seconds). */
export const POLL_INTERVAL_MS = 30_000;

/** Balance older than this is treated as stale (1 minute). */
export const STALE_THRESHOLD_MS = 60_000;

/** Roll back optimistic updates if HCM does not respond within this window (10 seconds). */
export const OPTIMISTIC_TIMEOUT_MS = 10_000;
