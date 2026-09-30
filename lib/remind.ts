import { Timestamp } from 'firebase-admin/firestore';
import { phoneShowsReminders } from './alarm-devices';
import { reminderPush } from './notify';
import { pushToUser } from './push';
import { nextReminderAt, type Stage, stageTimes } from './stages';
import { type TaskDoc, tasksCollection } from './tasks';
import { userRef, usersCollection } from './users';

export type RemindResult = { users: number; sent: number };

/**
 * Sends every reminder whose time has come. Only students whose `nextAt` has passed are read, so the
 * job stays cheap however many students there are.
 */
export async function runReminders(now = new Date()): Promise<RemindResult> {
  const due = await usersCollection().where('nextAt', '<=', now.getTime()).get();
  let sent = 0;
  for (const user of due.docs) sent += await remindUser(user.id, now);
  return { users: due.size, sent };
}

/**
 * For each of a student's pending tasks, fires every stage whose time has come and hasn't fired yet,
 * as one combined notification. Snoozed tasks wait; when a snooze ends, the task gets a reminder even
 * if no stage is due. Returns how many notifications went out.
 */
async function remindUser(uid: string, now: Date): Promise<number> {
  const snap = await tasksCollection(uid).where('status', '==', 'pending').get();
  // The Android app shows these at their exact minute itself (app/api/alarms), so its browser is skipped.
  const skipAppDevices = await phoneShowsReminders(uid);
  const after: { dueAt: number; notifiedStages: Stage[]; snoozedUntil: number | null }[] = [];
  let sent = 0;

  for (const doc of snap.docs) {
    const t = doc.data() as TaskDoc;
    const snoozedUntil = t.snoozedUntil?.toDate();
    const dueAt = t.dueAt.toDate();
    if (snoozedUntil && snoozedUntil > now) {
      after.push({ dueAt: dueAt.getTime(), notifiedStages: t.notifiedStages, snoozedUntil: snoozedUntil.getTime() });
      continue;
    }

    const due = stageTimes(dueAt)
      .filter(([stage, at]) => at <= now && !t.notifiedStages.includes(stage))
      .map(([stage]) => stage);
    const snoozeEnded = !!snoozedUntil;
    const notifiedStages = [...t.notifiedStages, ...due];
    after.push({ dueAt: dueAt.getTime(), notifiedStages, snoozedUntil: null });
    if (due.length === 0 && !snoozeEnded) continue;

    const push = reminderPush({ id: doc.id, course: t.course, title: t.title, type: t.type, dueAt }, due, snoozeEnded, now);
    await pushToUser(uid, { ...push, skipAppDevices });
    await doc.ref.update({ notifiedStages, snoozedUntil: null, updatedAt: Timestamp.fromDate(now) });
    sent++;
  }

  await userRef(uid).update({ nextAt: nextReminderAt(after) });
  return sent;
}
