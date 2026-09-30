import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { actionToken } from './auth';
import { db } from './firebase-admin';
import { isQuiet } from './quiet';

export type Push = {
  title: string;
  body: string;
  /** Set for task reminders: adds the Mark done / Remind in 2h buttons and opens that task on tap. */
  taskId?: string;
  /** Stays on screen until acted on. */
  sticky?: boolean;
  /** A test the student asked for: plays the notification sound even in quiet hours. */
  test?: boolean;
  /** Leave out the Lume Android app's own browser: the app shows this reminder itself. */
  skipAppDevices?: boolean;
};

/*
 * Browsers with notifications on, in `devices/{hash of FCM token}` with the student's `uid`. One
 * browser belongs to one student at a time: turning notifications on for another Lume moves it.
 */
const devices = () => db().collection('devices');
const deviceId = (token: string) => createHash('sha256').update(token).digest('hex').slice(0, 32);

export async function saveDevice(uid: string, token: string, label: string): Promise<void> {
  await devices().doc(deviceId(token)).set({ uid, token, label: label.slice(0, 60), lastSeenAt: Timestamp.now() });
}

export async function removeDevice(uid: string, token: string): Promise<void> {
  const ref = devices().doc(deviceId(token));
  const doc = await ref.get();
  if (doc.exists && doc.get('uid') === uid) await ref.delete();
}

export async function countDevices(uid: string): Promise<number> {
  return (await devices().where('uid', '==', uid).count().get()).data().count;
}

/**
 * Sends a notification to each of the student's devices as a data-only message, so the service
 * worker draws it (with action buttons). Devices whose tokens FCM rejects are forgotten.
 */
export async function pushToUser(uid: string, push: Push): Promise<{ sent: number; failed: number }> {
  const all = await devices().where('uid', '==', uid).get();
  // Devices registered from inside the installed app are labelled "… (app)" (components/app/push-client.ts).
  const docs = push.skipAppDevices ? all.docs.filter((d) => !String(d.get('label')).endsWith('(app)')) : all.docs;
  if (docs.length === 0) return { sent: 0, failed: 0 };

  // In quiet hours notifications still arrive, but without sound or vibration, and never stick.
  const quiet = !push.test && isQuiet(Date.now());
  const data: Record<string, string> = {
    title: push.title,
    body: push.body,
    tag: push.taskId ?? `lume-${Date.now()}`,
    url: push.taskId ? `/dashboard?task=${push.taskId}` : '/dashboard',
    sticky: push.sticky && !quiet ? '1' : '0',
    silent: quiet ? '1' : '0',
  };
  if (push.taskId) {
    data.taskId = push.taskId;
    data.actionToken = actionToken(uid, push.taskId);
  }

  const result = await getMessaging().sendEach(
    docs.map((d) => ({
      token: d.get('token') as string,
      data,
      webpush: { headers: { Urgency: 'high', TTL: String(6 * 3600) } },
    })),
  );

  const stale = result.responses
    .map((r, i) => (!r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(r.error?.code ?? '') ? docs[i].ref : null))
    .filter((ref) => ref !== null);
  await Promise.all(stale.map((ref) => ref.delete()));

  return { sent: result.successCount, failed: result.failureCount };
}
