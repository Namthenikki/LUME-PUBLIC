import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { linkId, type Sealed, seal, unseal } from './auth';
import { db } from './firebase-admin';
import type { LmsLink } from './lms-link';
import { istDateKey, istDayNumber } from './time';

/*
 * One document per student in `users/{uid}`, with their tasks and statuses underneath. The LMS link
 * is stored encrypted; `links/{linkId}` maps a link to its student, so pasting it again (new phone,
 * cleared browser) opens the same Lume.
 */

export type UserDoc = {
  feed: Sealed;
  linkId: string;
  createdAt: Timestamp;
  lastSeenAt: Timestamp;
  /** When the next reminder is due for any of their tasks (epoch ms), so the reminder job only reads who needs it. */
  nextAt: number | null;
  /** Sign-in generation (lib/auth.ts sessionToken). Missing means 0. */
  sessionGen?: number;
  /** Alarms turned off in Settings: their phones get every reminder as a plain notification instead. */
  alarmsOff?: boolean;
  /** The last IST day (istDayNumber) they opened Lume. Missing until their first visit after 2026-10-17. */
  activeDay?: number;
};

export const usersCollection = () => db().collection('users');
export const userRef = (uid: string) => usersCollection().doc(uid);
const links = () => db().collection('links');
/** `activity/{IST date}`: which students opened Lume that day, for the owner's usage page (/stats). */
export const activityCollection = () => db().collection('activity');

/** Opens the Lume for this link, creating it the first time. `gen` is the sign-in generation for the new cookie. */
export async function connectLink(link: LmsLink): Promise<{ uid: string; created: boolean; gen: number }> {
  const linkRef = links().doc(linkId(link.token));
  return db().runTransaction(async (tx) => {
    const found = await tx.get(linkRef);
    const now = Timestamp.now();
    if (found.exists) {
      const uid = found.get('uid') as string;
      const user = await tx.get(userRef(uid));
      if (user.exists) {
        tx.update(userRef(uid), { lastSeenAt: now });
        return { uid, created: false, gen: (user.get('sessionGen') as number | undefined) ?? 0 };
      }
    }
    const uid = randomBytes(16).toString('base64url');
    tx.set(linkRef, { uid, createdAt: now });
    tx.set(userRef(uid), { feed: seal(link.url), linkId: linkRef.id, createdAt: now, lastSeenAt: now, nextAt: null } satisfies UserDoc);
    return { uid, created: true, gen: 0 };
  });
}

/**
 * Swaps in a new LMS link, keeping everything else. The old link stops opening this Lume, and the
 * sign-in generation goes up, so browsers that got in with the old link are signed out too.
 */
export async function changeLink(uid: string, link: LmsLink): Promise<'ok' | 'same' | 'taken'> {
  const newRef = links().doc(linkId(link.token));
  return db().runTransaction(async (tx) => {
    const [user, taken] = await Promise.all([tx.get(userRef(uid)), tx.get(newRef)]);
    if (!user.exists) throw new Error('No such user');
    if (taken.exists) return taken.get('uid') === uid ? 'same' : 'taken';
    tx.delete(links().doc(user.get('linkId') as string));
    tx.set(newRef, { uid, createdAt: Timestamp.now() });
    tx.update(userRef(uid), { feed: seal(link.url), linkId: newRef.id, sessionGen: ((user.get('sessionGen') as number | undefined) ?? 0) + 1 });
    return 'ok';
  });
}

/** Signs out every other browser: returns the new sign-in generation, for this browser's fresh cookie. */
export async function bumpSessionGen(uid: string): Promise<number> {
  return db().runTransaction(async (tx) => {
    const user = await tx.get(userRef(uid));
    if (!user.exists) throw new Error('No such user');
    const gen = ((user.get('sessionGen') as number | undefined) ?? 0) + 1;
    tx.update(userRef(uid), { sessionGen: gen });
    return gen;
  });
}

export async function getUser(uid: string): Promise<UserDoc | null> {
  const doc = await userRef(uid).get();
  return doc.exists ? (doc.data() as UserDoc) : null;
}

export function feedUrl(user: UserDoc): string {
  return unseal(user.feed);
}

/**
 * Marks the student as active today, once per IST day, when they open Lume (the phone's background
 * syncs don't count). The owner's usage page counts daily and weekly active students from this.
 */
export async function touchUser(uid: string, user: UserDoc): Promise<void> {
  const now = Date.now();
  const today = istDayNumber(now);
  if (user.activeDay === today) return;
  const batch = db().batch();
  batch.update(userRef(uid), { lastSeenAt: Timestamp.fromMillis(now), activeDay: today });
  batch.set(activityCollection().doc(istDateKey(now)), { uids: FieldValue.arrayUnion(uid) }, { merge: true });
  await batch.commit();
}

/** Deletes everything Lume holds for a student: tasks, statuses, devices, phones, the link, and their days in the usage counts. */
export async function deleteUser(uid: string): Promise<void> {
  const user = await getUser(uid);
  await db().recursiveDelete(userRef(uid));
  if (user) await links().doc(user.linkId).delete();
  for (const name of ['devices', 'alarmDevices']) {
    const snap = await db().collection(name).where('uid', '==', uid).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  const days = await activityCollection().where('uids', 'array-contains', uid).get();
  await Promise.all(days.docs.map((d) => d.ref.update({ uids: FieldValue.arrayRemove(uid) })));
}
