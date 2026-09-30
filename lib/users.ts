import { randomBytes } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { linkId, type Sealed, seal, unseal } from './auth';
import { db } from './firebase-admin';
import type { LmsLink } from './lms-link';

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
};

export const usersCollection = () => db().collection('users');
export const userRef = (uid: string) => usersCollection().doc(uid);
const links = () => db().collection('links');

/** Opens the Lume for this link, creating it the first time. */
export async function connectLink(link: LmsLink): Promise<{ uid: string; created: boolean }> {
  const linkRef = links().doc(linkId(link.token));
  return db().runTransaction(async (tx) => {
    const found = await tx.get(linkRef);
    const now = Timestamp.now();
    if (found.exists) {
      const uid = found.get('uid') as string;
      const user = await tx.get(userRef(uid));
      if (user.exists) {
        tx.update(userRef(uid), { lastSeenAt: now });
        return { uid, created: false };
      }
    }
    const uid = randomBytes(16).toString('base64url');
    tx.set(linkRef, { uid, createdAt: now });
    tx.set(userRef(uid), { feed: seal(link.url), linkId: linkRef.id, createdAt: now, lastSeenAt: now, nextAt: null } satisfies UserDoc);
    return { uid, created: true };
  });
}

/** Swaps in a new LMS link (after resetting it on the LMS), keeping everything else. */
export async function changeLink(uid: string, link: LmsLink): Promise<'ok' | 'same' | 'taken'> {
  const newRef = links().doc(linkId(link.token));
  return db().runTransaction(async (tx) => {
    const [user, taken] = await Promise.all([tx.get(userRef(uid)), tx.get(newRef)]);
    if (!user.exists) throw new Error('No such user');
    if (taken.exists) return taken.get('uid') === uid ? 'same' : 'taken';
    tx.delete(links().doc(user.get('linkId') as string));
    tx.set(newRef, { uid, createdAt: Timestamp.now() });
    tx.update(userRef(uid), { feed: seal(link.url), linkId: newRef.id });
    return 'ok';
  });
}

export async function getUser(uid: string): Promise<UserDoc | null> {
  const doc = await userRef(uid).get();
  return doc.exists ? (doc.data() as UserDoc) : null;
}

export function feedUrl(user: UserDoc): string {
  return unseal(user.feed);
}

/** Marks the student as active, at most twice a day (it's only used to spot abandoned accounts). */
export async function touchUser(uid: string, user: UserDoc): Promise<void> {
  if (Date.now() - user.lastSeenAt.toMillis() > 12 * 3_600_000) await userRef(uid).update({ lastSeenAt: Timestamp.now() });
}

/** Deletes everything Lume holds for a student: tasks, statuses, devices, phones and the link. */
export async function deleteUser(uid: string): Promise<void> {
  const user = await getUser(uid);
  await db().recursiveDelete(userRef(uid));
  if (user) await links().doc(user.linkId).delete();
  for (const name of ['devices', 'alarmDevices']) {
    const snap = await db().collection(name).where('uid', '==', uid).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}
