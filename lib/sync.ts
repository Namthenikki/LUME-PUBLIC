import { Timestamp } from 'firebase-admin/firestore';
import { deadlineChangedPush, newTaskPush } from './notify';
import { pushToUser } from './push';
import { lmsAdapter } from './sources';
import type { SourceAdapter } from './sources/types';
import { pastStages } from './stages';
import { refreshNextAt, type TaskDoc, taskId, tasksCollection } from './tasks';
import { db } from './firebase-admin';
import { type UserDoc, userRef, usersCollection } from './users';

export type SyncChange = {
  kind: 'new' | 'changed' | 'cancelled' | 'submitted';
  id: string;
  course: string;
  title: string;
  type: string;
  dueAt: Date;
  previousDueAt?: Date;
};

export type SyncResult =
  | { source: string; ok: true; inFeed: number; changes: SyncChange[] }
  | { source: string; ok: false; error: string };

/** The last sync of each source, for "Synced 2 min ago" in the app. */
export type SyncStatus = { at: number; ok: boolean; message: string };

const DAY = 86_400_000;

/** Syncs a student's sources; one failing source doesn't stop the others. */
export async function runSync(uid: string, adapters: SourceAdapter[], now = new Date()): Promise<SyncResult[]> {
  const results = await Promise.all(
    adapters.map(async (adapter): Promise<SyncResult> => {
      const previous = await getSyncStatus(uid, adapter.source);
      let result: SyncResult;
      try {
        // The first sync of a source fills Lume in while the student watches: no "New assignment" pushes.
        result = { source: adapter.source, ok: true, ...(await syncSource(uid, adapter, now, previous === null)) };
      } catch (err) {
        result = { source: adapter.source, ok: false, error: err instanceof Error ? err.message : String(err) };
      }
      await setSyncStatus(uid, adapter.source, {
        at: now.getTime(),
        ok: result.ok,
        message: result.ok ? `${result.inFeed} items in the feed, ${result.changes.length} changes` : result.error,
      });
      // Say it once when the LMS link stops working (usually because it was reset on the LMS).
      if (!result.ok && adapter.source === 'manipal' && previous?.ok !== false) {
        await pushToUser(uid, { title: 'Lume can’t read your LMS', body: 'Open Lume → Settings and paste your calendar link again.' });
      }
      return result;
    }),
  );
  if (results.some((r) => r.ok && r.changes.length > 0)) await refreshNextAt(uid);
  return results;
}

/** Syncs every student's LMS feed, a few at a time (the hourly scheduler job). */
export async function syncAllUsers(now = new Date()): Promise<{ users: number; failed: number }> {
  const snap = await usersCollection().get();
  const queue = [...snap.docs];
  let failed = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let doc = queue.shift(); doc; doc = queue.shift()) {
        try {
          const [result] = await runSync(doc.id, [lmsAdapter(doc.data() as UserDoc)], now);
          if (!result.ok) failed++;
        } catch (err) {
          failed++;
          console.error('Sync failed for a user', err instanceof Error ? err.message : err);
        }
      }
    }),
  );
  return { users: snap.size, failed };
}

const statusRef = (uid: string, source: string) => userRef(uid).collection('meta').doc(`sync-${source}`);

export async function getSyncStatus(uid: string, source: string): Promise<SyncStatus | null> {
  const doc = await statusRef(uid, source).get();
  return doc.exists ? (doc.data() as SyncStatus) : null;
}

export async function setSyncStatus(uid: string, source: string, status: SyncStatus): Promise<void> {
  await statusRef(uid, source).set(status);
}

async function syncSource(uid: string, adapter: SourceAdapter, now: Date, firstSync: boolean) {
  const feed = await adapter.fetchTasks();
  const tasks = tasksCollection(uid);
  // Only recent tasks can still change; anything past when it's first seen is ignored anyway.
  const snapshot = await tasks.where('dueAt', '>=', Timestamp.fromMillis(now.getTime() - 30 * DAY)).get();
  const existing = new Map(snapshot.docs.filter((d) => d.get('source') === adapter.source).map((d) => [d.id, d.data() as TaskDoc]));

  const batch = db().batch();
  const changes: SyncChange[] = [];
  const nowTs = Timestamp.fromDate(now);
  const seen = new Set<string>();

  for (const t of feed) {
    const id = taskId(t.source, t.externalId);
    seen.add(id);
    const prev = existing.get(id);
    const info = { course: t.course, title: t.title, type: t.type, url: t.url };
    const opensAt = t.opensAt ? Timestamp.fromDate(t.opensAt) : null;
    const dueAt = Timestamp.fromDate(t.dueAt);
    const change = { id, course: t.course, title: t.title, type: t.type, dueAt: t.dueAt };

    // New, or back in the feed after being cancelled. Anything already past when first seen is ignored.
    if (!prev || (prev.status === 'cancelled' && t.dueAt > now)) {
      if (t.dueAt <= now) continue;
      const doc: TaskDoc = {
        source: t.source,
        externalId: t.externalId,
        ...info,
        dueAt,
        opensAt,
        // Already submitted when first seen: straight to Done, without a "New" notification.
        status: t.submitted ? 'done' : 'pending',
        createdAt: prev?.createdAt ?? nowTs,
        updatedAt: nowTs,
        // "new" is sent right after this sync commits.
        notifiedStages: ['new', ...pastStages(t.dueAt, now)],
        snoozedUntil: null,
        doneAt: t.submitted ? nowTs : null,
      };
      batch.set(tasks.doc(id), doc);
      changes.push({ kind: t.submitted ? 'submitted' : 'new', ...change });
      continue;
    }

    // Submitted on the source since the last sync: done, so its reminders stop.
    const submittedNow = !!t.submitted && prev.status === 'pending';

    const dueChanged = !prev.dueAt.isEqual(dueAt);
    const infoChanged =
      JSON.stringify([prev.course, prev.title, prev.type, prev.url, prev.opensAt?.toMillis()]) !==
      JSON.stringify([info.course, info.title, info.type, info.url, opensAt?.toMillis()]);
    if (!dueChanged && !infoChanged && !submittedNow) continue;

    const update: Partial<TaskDoc> = { ...info, opensAt, dueAt, updatedAt: nowTs };
    if (submittedNow) {
      Object.assign(update, { status: 'done', doneAt: nowTs, snoozedUntil: null });
      changes.push({ kind: 'submitted', ...change });
    } else if (dueChanged && prev.status === 'pending') {
      // Reminders restart against the new deadline; stages already past for it are skipped.
      const alreadyNew = prev.notifiedStages.includes('new') ? (['new'] as const) : [];
      update.notifiedStages = [...alreadyNew, ...pastStages(t.dueAt, now)];
      changes.push({ kind: 'changed', ...change, previousDueAt: prev.dueAt.toDate() });
    }
    batch.update(tasks.doc(id), update);
  }

  // Pending tasks that vanished from the feed were deleted or hidden in the LMS. An empty feed is more
  // likely a glitch than every task being deleted at once, so it never cancels anything. Sources
  // that don't list everything never cancel either.
  if (adapter.authoritative && feed.length > 0) {
    for (const [id, prev] of existing) {
      if (seen.has(id) || prev.status !== 'pending') continue;
      batch.update(tasks.doc(id), { status: 'cancelled', updatedAt: nowTs });
      changes.push({ kind: 'cancelled', id, course: prev.course, title: prev.title, type: prev.type, dueAt: prev.dueAt.toDate() });
    }
  }

  await batch.commit();

  if (!firstSync) {
    for (const c of changes) {
      if (c.kind === 'new') await pushToUser(uid, newTaskPush(c));
      if (c.kind === 'changed') await pushToUser(uid, deadlineChangedPush(c, c.previousDueAt!));
    }
  }
  return { inFeed: feed.length, changes };
}
