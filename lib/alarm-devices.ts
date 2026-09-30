import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from './firebase-admin';

/**
 * Phones running the Lume Android app, which rings alarms right before deadlines.
 *
 * Pairing: on first launch the app opens Lume with `?lume_device=<random token>`. The page, open in
 * the student's Lume, approves that token for them here. From then on the app reads /api/alarms with
 * it. Only a hash of the token is stored, with the student's `uid`.
 */

const devices = () => db().collection('alarmDevices');
const idOf = (token: string) => createHash('sha256').update(token).digest('hex');

export const isDeviceToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(t);

/**
 * Pairs a phone with this student, or moves it to them from whoever had it (a friend signing in on the
 * same phone). Returns false when it was already theirs, so nothing is written.
 */
export async function pairAlarmDevice(uid: string, token: string, label: string): Promise<boolean> {
  const ref = devices().doc(idOf(token));
  const doc = await ref.get();
  if (doc.exists && doc.get('uid') === uid) return false;
  const now = Timestamp.now();
  await ref.set({ uid, label: label.slice(0, 80), pairedAt: now, lastSeenAt: now }, { merge: true });
  return true;
}

/** Signing out on a phone: it stops ringing this student's alarms (at its next sync). */
export async function releaseAlarmDevice(uid: string, token: string): Promise<void> {
  const ref = devices().doc(idOf(token));
  const doc = await ref.get();
  if (doc.exists && doc.get('uid') === uid) await ref.delete();
}

/**
 * Whose phone this is, or null if it isn't paired. `reminders`: this version of the app shows deadline
 * reminders itself (see phoneShowsReminders).
 */
export async function alarmDeviceUser(token: string, reminders = false): Promise<string | null> {
  const ref = devices().doc(idOf(token));
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.update({ lastSeenAt: Timestamp.now(), reminders });
  return doc.get('uid') as string;
}

/**
 * True while one of the student's phones whose app shows reminders itself has checked in within the
 * last 3 hours. Web pushes of reminders then skip that phone's browser, so nothing arrives twice. If
 * the app goes quiet (uninstalled, or an old version), web pushes take over again.
 */
export async function phoneShowsReminders(uid: string): Promise<boolean> {
  const snap = await devices().where('uid', '==', uid).get();
  return snap.docs.some((d) => d.get('reminders') === true && Date.now() - (d.get('lastSeenAt') as Timestamp).toMillis() < 3 * 3_600_000);
}

export async function listAlarmDevices(uid: string): Promise<{ label: string; lastSeenAt: number }[]> {
  const snap = await devices().where('uid', '==', uid).get();
  return snap.docs.map((d) => ({ label: d.get('label') as string, lastSeenAt: (d.get('lastSeenAt') as Timestamp).toMillis() }));
}

/** Unpairs every phone of the student's except `keepToken` (this one). Returns how many went. */
export async function unpairOtherPhones(uid: string, keepToken: string | null): Promise<number> {
  const snap = await devices().where('uid', '==', uid).get();
  const keep = keepToken ? idOf(keepToken) : null;
  const others = snap.docs.filter((d) => d.id !== keep);
  await Promise.all(others.map((d) => d.ref.delete()));
  return others.length;
}

export async function unpairAllAlarmDevices(uid: string): Promise<void> {
  const snap = await devices().where('uid', '==', uid).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}
