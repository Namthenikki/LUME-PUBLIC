'use server';

import { cookies } from 'next/headers';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { isDeviceToken, isPhoneId, pairAlarmDevice, phoneId, releaseAlarmDevice, setAlarmsOn, unpairAllAlarmDevices, unpairOtherPhones } from '@/lib/alarm-devices';
import { PHONE_COOKIE, USER_COOKIE } from '@/lib/auth';
import { syncUserIfStale } from '@/lib/catch-up';
import { parseLmsLink } from '@/lib/lms-link';
import { pushToUser, removeDevice, removeOtherDevices, saveDevice } from '@/lib/push';
import { isQuiet } from '@/lib/quiet';
import { currentUserId, requireUser, setSessionCookie } from '@/lib/session';
import { ManipalIcsAdapter } from '@/lib/sources/manipal-ics';
import { runSync } from '@/lib/sync';
import { markDone, markPending, snooze } from '@/lib/tasks';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import { bumpSessionGen, changeLink, deleteUser, getUser } from '@/lib/users';

/** This device's own phone token and browser push token, which a sign-out of the other devices keeps. */
type ThisDevice = { phone?: string | null; push?: string | null };

/**
 * This browser's phone, as a phoneId: from the token the page keeps (paired here), or from the cookie
 * left by a phone sign-in (in a browser the page never saw the token in).
 */
async function thisPhoneId(token?: string | null): Promise<string | null> {
  if (isDeviceToken(token)) return phoneId(token);
  const id = (await cookies()).get(PHONE_COOKIE)?.value;
  return isPhoneId(id) ? id : null;
}

/** Everything but this device stops opening, ringing or notifying for the student. */
async function dropOtherDevices(uid: string, gen: number, device: ThisDevice) {
  const [browsers, phones] = await Promise.all([
    removeOtherDevices(uid, typeof device.push === 'string' ? device.push : null),
    unpairOtherPhones(uid, await thisPhoneId(device.phone)),
  ]);
  await setSessionCookie(uid, gen);
  return { browsers, phones };
}

export async function markDoneAction(id: string) {
  const uid = await requireUser();
  await markDone(uid, id);
  refresh();
}

export async function undoDoneAction(id: string) {
  const uid = await requireUser();
  await markPending(uid, id);
  refresh();
}

export async function snoozeAction(id: string) {
  const uid = await requireUser();
  await snooze(uid, id);
  refresh();
}

export async function syncNowAction(): Promise<{ ok: boolean; message: string }> {
  const uid = await requireUser();
  // A sync that started seconds ago (from another device or the scheduler) already covers this.
  const results = (await syncUserIfStale(uid, 10_000)) ?? [];
  refresh();
  const failed = results.find((r) => !r.ok);
  if (failed && !failed.ok) return { ok: false, message: failed.error };
  const added = results.reduce((n, r) => n + (r.ok ? r.changes.filter((c) => c.kind === 'new').length : 0), 0);
  return { ok: true, message: added ? `Found ${added} new ${added === 1 ? 'deadline' : 'deadlines'}` : 'Up to date' };
}

/** Replaces the LMS link, e.g. after resetting it on the LMS. Everything else stays. */
export async function changeLinkAction(_prev: { ok?: string; error?: string } | null, form: FormData): Promise<{ ok?: string; error?: string }> {
  const uid = await requireUser();
  const link = parseLmsLink(String(form.get('link') ?? ''));
  if ('error' in link) return { error: link.error };
  let tasks;
  try {
    tasks = await new ManipalIcsAdapter(link.url).fetchTasks();
  } catch {
    return { error: 'The LMS didn’t accept that link. Copy it again from Calendar → Subscribe.' };
  }
  const outcome = await changeLink(uid, link);
  if (outcome === 'taken') return { error: 'That link already opens another Lume (maybe you connected it on another phone). Use that one instead.' };
  // The old link is dead, and so is every device that got in with it; this one stays signed in.
  if (outcome === 'ok') {
    const user = await getUser(uid);
    await dropOtherDevices(uid, user?.sessionGen ?? 0, { phone: String(form.get('phone') ?? ''), push: String(form.get('push') ?? '') });
  }
  await runSync(uid, [{ source: 'manipal', authoritative: true, fetchTasks: async () => tasks }]);
  refresh();
  return {
    ok: outcome === 'same' ? 'That’s the link you already use. Lume is up to date.' : 'Link updated. Other devices were signed out: paste the new link there to use Lume on them.',
  };
}

/**
 * Approves the Android app's device token for this student, so it reads their alarm schedule. Runs
 * each time the app opens, so a phone always rings for whoever is signed in on it.
 */
export async function pairAlarmDeviceAction(token: string): Promise<boolean> {
  const uid = await requireUser();
  if (!isDeviceToken(token)) return false;
  const changed = await pairAlarmDevice(uid, token, 'Android app');
  if (changed) refresh();
  return changed;
}

/** Before signing out on a phone: its alarms stop being this student's. */
export async function releasePhoneAction(token: string) {
  const uid = await requireUser();
  if (isDeviceToken(token)) await releaseAlarmDevice(uid, phoneId(token));
}

export async function unpairAlarmDevicesAction() {
  const uid = await requireUser();
  await unpairAllAlarmDevices(uid);
  refresh();
}

/** Alarms on or off for every phone of this student's; off, their reminders come as plain notifications. */
export async function setAlarmsOnAction(on: boolean) {
  const uid = await requireUser();
  await setAlarmsOn(uid, on);
  refresh();
}

export async function registerDeviceAction(token: string, label: string) {
  const uid = await requireUser();
  await saveDevice(uid, token, label);
}

export async function removeDeviceAction(token: string) {
  const uid = await requireUser();
  await removeDevice(uid, token);
}

export async function sendTestAction(): Promise<{ sent: number; quietHours: boolean }> {
  const uid = await requireUser();
  const { sent } = await pushToUser(uid, { title: 'Reminders are on', body: 'This is how Lume will remind you before each deadline.', test: true });
  return { sent, quietHours: isQuiet(Date.now()) };
}

export async function setThemeAction(theme: string) {
  await requireUser();
  (await cookies()).set(THEME_COOKIE, parseTheme(theme), { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  refresh();
}

/**
 * Signs out every other browser and phone (a friend's phone the link was pasted on, an old laptop):
 * their cookies stop working, and they get no more of the student's notifications or alarms.
 */
export async function signOutOtherDevicesAction(device: ThisDevice): Promise<{ browsers: number; phones: number }> {
  const uid = await requireUser();
  const result = await dropOtherDevices(uid, await bumpSessionGen(uid), device);
  refresh();
  return result;
}

/** Forgets this browser. The student's Lume stays; pasting the LMS link again opens it. */
export async function signOutAction() {
  const jar = await cookies();
  // Signed in by a phone: release it too, or the app would sign this browser straight back in.
  const uid = await currentUserId();
  const phone = await thisPhoneId();
  if (uid && phone) await releaseAlarmDevice(uid, phone);
  jar.delete(USER_COOKIE);
  jar.delete(PHONE_COOKIE);
  redirect('/');
}

/** Deletes the student's Lume for good: tasks, statuses, devices, phones and the stored link. */
export async function deleteDataAction() {
  const uid = await requireUser();
  await deleteUser(uid);
  (await cookies()).delete(USER_COOKIE);
  (await cookies()).delete(PHONE_COOKIE);
  redirect('/?deleted=1');
}
