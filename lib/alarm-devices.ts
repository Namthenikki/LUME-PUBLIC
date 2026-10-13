import { createHash, randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from './firebase-admin';
import { userRef } from './users';

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

/** A phone's id: the hash its record is stored under. Not a credential, so it can sit in a cookie. */
export const phoneId = (token: string) => idOf(token);
export const isPhoneId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);

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

/** Signing out on a phone: it stops ringing this student's alarms (at its next sync). `id`: phoneId(token). */
export async function releaseAlarmDevice(uid: string, id: string): Promise<void> {
  const ref = devices().doc(id);
  const doc = await ref.get();
  if (doc.exists && doc.get('uid') === uid) await ref.delete();
}

/**
 * Whose phone this is, or null if it isn't paired. `reminders`: this version of the app shows deadline
 * reminders itself (see phoneShowsReminders). `appVersion`: the version code it reports, for the
 * update banner (apps from 2026-10-09 on).
 */
export async function alarmDeviceUser(token: string, reminders = false, appVersion: number | null = null): Promise<string | null> {
  const ref = devices().doc(idOf(token));
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.update({ lastSeenAt: Timestamp.now(), reminders, ...(appVersion ? { appVersion } : {}) });
  return doc.get('uid') as string;
}

/**
 * The newest app version the student's phones have reported. After an update Android often brings
 * back the open Lume page without a fresh launch, so the version in its launch URL can be stale; the
 * phone's next sync (right after the update) reports the new one here.
 */
export async function reportedAppVersion(uid: string): Promise<number | null> {
  const snap = await devices().where('uid', '==', uid).get();
  const versions = snap.docs.map((d) => d.get('appVersion')).filter((v): v is number => typeof v === 'number');
  return versions.length ? Math.max(...versions) : null;
}

/** Whether the student's phones ring alarms. Off, the stages that would ring come as plain notifications. On unless turned off. */
export async function alarmsOn(uid: string): Promise<boolean> {
  return (await userRef(uid).get()).get('alarmsOff') !== true;
}

export async function setAlarmsOn(uid: string, on: boolean): Promise<void> {
  await userRef(uid).update({ alarmsOff: !on });
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

/** Unpairs every phone of the student's except `keepId` (this one, a phoneId). Returns how many went. */
export async function unpairOtherPhones(uid: string, keepId: string | null): Promise<number> {
  const snap = await devices().where('uid', '==', uid).get();
  const others = snap.docs.filter((d) => d.id !== keepId);
  await Promise.all(others.map((d) => d.ref.delete()));
  return others.length;
}

export async function unpairAllAlarmDevices(uid: string): Promise<void> {
  const snap = await devices().where('uid', '==', uid).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

/*
 * Phone sign-in. The app can open Lume in a browser that has no session yet (another browser than
 * before, or after clearing data). While its intro plays it trades its device token (sent in a
 * header, never in a URL) for a one-time code that lasts 2 minutes, and opens Lume with
 * `?lume_signin=<code>`; /api/signin turns that into the usual session cookie. A phone that was
 * signed out (released) or unpaired gets no code, so signing out stays signed out.
 */

const SIGN_IN_CODE_MS = 2 * 60_000;

/** A fresh one-time code for the student this phone is paired with, or null if it isn't paired. */
export async function createSignInCode(token: string): Promise<string | null> {
  const ref = devices().doc(idOf(token));
  if (!(await ref.get()).exists) return null;
  const code = randomBytes(24).toString('base64url');
  // Stored on the phone's record, so each new code replaces the last and nothing piles up.
  await ref.update({ signIn: { code: idOf(code), expiresAt: Timestamp.fromMillis(Date.now() + SIGN_IN_CODE_MS) } });
  return code;
}

/** Uses up a sign-in code: the student and phone it was made for, or null if it's unknown, used or expired. */
export async function redeemSignInCode(code: unknown): Promise<{ uid: string; phone: string } | null> {
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(code)) return null;
  const hash = idOf(code);
  const found = (await devices().where('signIn.code', '==', hash).limit(1).get()).docs[0];
  if (!found) return null;
  return db().runTransaction(async (tx) => {
    const doc = await tx.get(found.ref);
    const signIn = doc.get('signIn') as { code: string; expiresAt: Timestamp } | undefined;
    if (!doc.exists || signIn?.code !== hash) return null;
    tx.update(found.ref, { signIn: FieldValue.delete() });
    return signIn.expiresAt.toMillis() > Date.now() ? { uid: doc.get('uid') as string, phone: doc.id } : null;
  });
}
