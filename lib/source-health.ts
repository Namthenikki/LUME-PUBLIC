import type { SyncStatus } from './sync';
import { HOUR } from './time';

export type Health = 'ok' | 'stale' | 'error' | 'off';

/**
 * NPTEL syncs only while Chrome is open on the laptop, every 3 hours. Two days without a sync
 * means new assignments could be missed, so the app says so.
 */
export const NPTEL_STALE_AFTER = 48 * HOUR;

export function nptelHealth(status: SyncStatus | null, now: number): Health {
  if (!status) return 'off';
  if (!status.ok) return 'error';
  return now - status.at > NPTEL_STALE_AFTER ? 'stale' : 'ok';
}

/** What Home shows when NPTEL needs a look; null when it's fine or not set up. */
export function nptelAlert(status: SyncStatus | null, now: number): string | null {
  const health = nptelHealth(status, now);
  if (health === 'error') return status!.message;
  if (health === 'stale') return `Not synced for ${Math.floor((now - status!.at) / (24 * HOUR))} days. Open Chrome on your laptop so new assignments show up.`;
  return null;
}
