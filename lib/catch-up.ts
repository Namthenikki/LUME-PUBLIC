import type { DocumentReference } from 'firebase-admin/firestore';
import { after } from 'next/server';
import { db } from './firebase-admin';
import { runReminders } from './remind';
import { lmsAdapter } from './sources';
import { runSync, syncAllUsers } from './sync';
import { getUser, userRef } from './users';

/*
 * Schedulers start runs late or skip them, so Lume also catches up whenever someone uses it: opening
 * the app, the Android alarm sync (every 15 minutes) or the NPTEL extension. That sends due reminders
 * (for everyone), and syncs that student's LMS if their last sync is over 50 minutes old.
 */

const REMIND_GAP = 60_000;
const SYNC_GAP = 50 * 60_000;

/**
 * Claims a job unless it started within `gapMs`. It's a transaction, so when two callers arrive at
 * once only one runs the job, and nobody gets the same notification twice.
 */
async function claim(ref: DocumentReference, gapMs: number, now: number): Promise<boolean> {
  return db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists && now - (doc.get('at') as number) < gapMs) return false;
    tx.set(ref, { at: now });
    return true;
  });
}

/** Sends due reminders, unless a check ran in the last minute. */
export async function remindIfIdle(now = new Date()) {
  return (await claim(db().collection('meta').doc('remind'), REMIND_GAP, now.getTime())) ? runReminders(now) : null;
}

/** Syncs one student's LMS, unless a sync of it started within `gapMs`. */
export async function syncUserIfStale(uid: string, gapMs = SYNC_GAP) {
  if (!(await claim(userRef(uid).collection('meta').doc('sync-lock'), gapMs, Date.now()))) return null;
  const user = await getUser(uid);
  return user ? runSync(uid, [lmsAdapter(user)]) : null;
}

/** Syncs every student (the hourly scheduler job), unless that started within the last minute. */
export async function syncAllIfIdle() {
  return (await claim(db().collection('meta').doc('sync-all'), 60_000, Date.now())) ? syncAllUsers() : null;
}

/** Catches up after the current response is sent, so the caller isn't slowed down. */
export function catchUpAfterResponse(uid: string): void {
  after(async () => {
    await syncUserIfStale(uid).catch((err) => console.error('Catch-up sync failed', err instanceof Error ? err.message : err));
    await remindIfIdle().catch((err) => console.error('Catch-up reminders failed', err instanceof Error ? err.message : err));
  });
}

/** When reminders were last checked, for Settings. */
export async function lastReminderCheck(): Promise<number | null> {
  const doc = await db().collection('meta').doc('remind').get();
  return doc.exists ? (doc.get('at') as number) : null;
}
