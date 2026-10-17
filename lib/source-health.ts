import type { SyncStatus } from './sync';
import { HOUR } from './time';

export type Health = 'ok' | 'stale' | 'error' | 'off';

/**
 * NPTEL syncs only while Chrome is open on the laptop, every hour. Two days without a sync
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

/** The extension version that reads the LMS Quizzes tool fully (quiz start times, attempts, what you can see). */
export const QUIZZES_EXTENSION = '1.3.1';

/** "1.2.1" is older than "1.3.0". Unknown versions ("?") count as old. */
export function olderThan(version: string | undefined, than: string): boolean {
  const parts = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const [a, b] = [parts(version ?? '0'), parts(than)];
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  return false;
}

/** Why the extension needs updating, or null when it's current. */
export function extensionUpdate(status: SyncStatus | null): string | null {
  if (!status || !olderThan(status.version, QUIZZES_EXTENSION)) return null;
  return 'Update the Lume extension in Chrome on your laptop (Settings → Lume extension), so Lume knows when each LMS quiz starts and ticks off the ones you attempt.';
}

/**
 * What Home shows when the LMS quizzes the extension reads (course posts, the Quizzes tool) aren't
 * being checked, or the extension is too old to read them all; null while all's well. Being
 * signed out of the LMS for a few hours is fine, two days isn't.
 */
export function postsAlert(status: SyncStatus | null, now: number): string | null {
  if (!status) return 'Update the Lume extension in Chrome on your laptop, so Lume sees every LMS quiz and ticks off the ones you attempt.';
  const okAt = status.ok ? status.at : status.okAt;
  if (okAt && now - okAt < NPTEL_STALE_AFTER) return extensionUpdate(status);
  const since = okAt ? `for ${Math.floor((now - okAt) / (24 * HOUR))} days` : 'yet';
  return `LMS quizzes not checked ${since}, so a quiz announced in a post could be missed and attempted ones won’t tick off. ${status.ok ? 'Open Chrome on your laptop.' : `${status.message.replace(/\.$/, '')}.`}`;
}
