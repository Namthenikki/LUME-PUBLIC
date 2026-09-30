import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { cache } from 'react';
import type { Source, TaskType } from './sources/types';
import { nextReminderAt, type Stage } from './stages';
import { userRef } from './users';

export type TaskStatus = 'pending' | 'done' | 'cancelled';

/** A document in `users/{uid}/tasks/{id}`. */
export interface TaskDoc {
  source: Source;
  externalId: string;
  course: string;
  title: string;
  type: TaskType;
  dueAt: Timestamp;
  opensAt: Timestamp | null;
  url: string | null;
  status: TaskStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** When it was marked done; used for "on time". */
  doneAt?: Timestamp | null;
  /** Stages that have fired, or were skipped because they were already past. */
  notifiedStages: Stage[];
  snoozedUntil: Timestamp | null;
}

/** A task as the UI gets it: plain data, times in epoch ms. */
export type TaskView = {
  id: string;
  source: Source;
  course: string;
  title: string;
  type: TaskType;
  dueAt: number;
  opensAt: number | null;
  url: string | null;
  status: TaskStatus;
  doneAt: number | null;
  notifiedStages: Stage[];
  snoozedUntil: number | null;
};

export function taskId(source: Source, externalId: string): string {
  return createHash('sha256').update(`${source}:${externalId}`).digest('hex').slice(0, 20);
}

export const tasksCollection = (uid: string) => userRef(uid).collection('tasks');

export function toView(id: string, t: TaskDoc): TaskView {
  return {
    id,
    source: t.source,
    course: t.course,
    title: t.title,
    type: t.type,
    dueAt: t.dueAt.toMillis(),
    opensAt: t.opensAt?.toMillis() ?? null,
    url: t.url,
    status: t.status,
    doneAt: t.doneAt?.toMillis() ?? null,
    notifiedStages: t.notifiedStages,
    snoozedUntil: t.snoozedUntil?.toMillis() ?? null,
  };
}

/** All of a student's tasks, soonest first. Cached per request, so the layout and the page share one read. */
export const listTasks = cache(async (uid: string): Promise<TaskView[]> => {
  const snap = await tasksCollection(uid).orderBy('dueAt').get();
  return snap.docs.map((d) => toView(d.id, d.data() as TaskDoc));
});

/** Tasks due after `sinceMs`: all the alarm schedule needs, without reading old history. */
export async function listTasksDueAfter(uid: string, sinceMs: number): Promise<TaskView[]> {
  const snap = await tasksCollection(uid).where('dueAt', '>=', Timestamp.fromMillis(sinceMs)).orderBy('dueAt').get();
  return snap.docs.map((d) => toView(d.id, d.data() as TaskDoc));
}

export async function getTask(uid: string, id: string): Promise<(TaskDoc & { id: string }) | null> {
  const doc = await tasksCollection(uid).doc(id).get();
  return doc.exists ? { id, ...(doc.data() as TaskDoc) } : null;
}

/**
 * Recomputes when this student's next reminder is due, after anything that changes it (a sync,
 * Mark done, a snooze, a reminder sent). The reminder job only reads students whose time has come.
 */
export async function refreshNextAt(uid: string): Promise<void> {
  const snap = await tasksCollection(uid).where('status', '==', 'pending').get();
  const next = nextReminderAt(
    snap.docs.map((d) => {
      const t = d.data() as TaskDoc;
      return { dueAt: t.dueAt.toMillis(), notifiedStages: t.notifiedStages, snoozedUntil: t.snoozedUntil?.toMillis() ?? null };
    }),
  );
  await userRef(uid).update({ nextAt: next });
}

export async function markDone(uid: string, id: string): Promise<void> {
  const now = Timestamp.now();
  await tasksCollection(uid).doc(id).update({ status: 'done', doneAt: now, snoozedUntil: null, updatedAt: now });
  await refreshNextAt(uid);
}

export async function markPending(uid: string, id: string): Promise<void> {
  await tasksCollection(uid).doc(id).update({ status: 'pending', doneAt: null, updatedAt: Timestamp.now() });
  await refreshNextAt(uid);
}

export const SNOOZE_HOURS = 2;

export async function snooze(uid: string, id: string): Promise<Date> {
  const until = new Date(Date.now() + SNOOZE_HOURS * 3_600_000);
  await tasksCollection(uid).doc(id).update({ snoozedUntil: Timestamp.fromDate(until), updatedAt: Timestamp.now() });
  await refreshNextAt(uid);
  return until;
}
