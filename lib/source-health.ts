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

/**
 * What Home shows when quizzes posted in LMS courses (read by the same extension) aren't being
 * checked; null while they are. Being signed out of the LMS for a few hours is fine, two days isn't.
 */
export function postsAlert(status: SyncStatus | null, now: number): string | null {
  if (!status) return 'Update the Lume extension in Chrome on your laptop, so Lume sees quizzes teachers announce in course posts.';
  const okAt = status.ok ? status.at : status.okAt;
  if (okAt && now - okAt < NPTEL_STALE_AFTER) return null;
  const since = okAt ? `for ${Math.floor((now - okAt) / (24 * HOUR))} days` : 'yet';
  return `Course posts not checked ${since}, so a quiz announced there could be missed. ${status.ok ? 'Open Chrome on your laptop.' : `${status.message.replace(/\.$/, '')}.`}`;
}
