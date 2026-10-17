import { alarmDeviceUser, alarmsOn, isDeviceToken } from '@/lib/alarm-devices';
import { actionToken } from '@/lib/auth';
import { catchUpAfterResponse } from '@/lib/catch-up';
import { reminderPush } from '@/lib/notify';
import { isQuiet } from '@/lib/quiet';
import { ALARM_STAGES, remindAt, sittingStart, stageTimes } from '@/lib/stages';
import { listTasksDueAfter } from '@/lib/tasks';

/**
 * The Android app's schedule: for each pending task due in the next week, the times it should ring
 * (12 hours, 6 hours, 30 minutes and 10 minutes before), plus what it needs to show the alarm and mark
 * the task done from it. A quiz sitting (8:00 to 8:30 PM) rings before it starts: its `dueAt` is then
 * the start, which the app counts down to, and `closesAt` the end. With alarms turned off in Settings
 * there are none, and those stages come as reminders instead; `alarmsOn` tells the app, so an alarm
 * set before the switch doesn't ring.
 * Apps that send `X-Lume-Reminders: 1` also get every other reminder ("6 hours left", "Due today"...)
 * as `kind: "reminder"`, which they show as a notification at its exact minute; Lume then stops
 * sending those as web pushes to that phone (lib/remind.ts). The paired device token says whose phone it is.
 */
export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const withReminders = request.headers.get('x-lume-reminders') === '1';
  const version = Number(request.headers.get('x-lume-app'));
  const appVersion = Number.isSafeInteger(version) && version > 0 ? version : null;
  const uid = isDeviceToken(token) ? await alarmDeviceUser(token, withReminders, appVersion) : null;
  if (!uid) return new Response('Unauthorized', { status: 401 });
  // The phone checks in every 15 minutes: a chance to catch up on anything the scheduler missed.
  catchUpAfterResponse(uid);

  const now = Date.now();
  const ring = await alarmsOn(uid);
  const alarms = [];
  // Tasks still pending (overdue ones too, for the "Missed" reminder); the app checks this list before
  // it rings or shows anything, so a task marked done since the last sync stays quiet.
  const pendingTaskIds: string[] = [];
  // Tasks due from yesterday on: enough for the "Missed" reminder, without reading old history.
  for (const t of await listTasksDueAfter(uid, now - 86_400_000)) {
    if (t.status === 'pending') pendingTaskIds.push(t.id);
    if (t.status !== 'pending' || t.dueAt <= now || t.dueAt - now > 7 * 86_400_000) continue;
    // Stages that ring as an alarm; their plain reminder is left out, so nothing shows twice.
    const ringing = new Set<string>();
    const countdownTo = remindAt(t);
    const closesAt = sittingStart(t) === null ? undefined : t.dueAt;
    for (const { stage, minutes } of ring ? ALARM_STAGES : []) {
      const at = countdownTo - minutes * 60_000;
      // Snoozed tasks don't ring until the snooze ends, and nothing rings in quiet hours.
      if (at <= now || (t.snoozedUntil && at < t.snoozedUntil) || isQuiet(at)) continue;
      ringing.add(stage);
      alarms.push({
        id: `${t.id}:${stage}`,
        taskId: t.id,
        at,
        minutesLeft: minutes,
        title: t.title,
        course: t.course,
        dueAt: countdownTo,
        closesAt,
        actionToken: actionToken(uid, t.id),
      });
    }
    if (!withReminders) continue;

    // The same reminders the server would push, each with the text it would have at its own time. An
    // alarm stage that falls in quiet hours doesn't ring, so it comes as a (silent) reminder instead.
    const info = { id: t.id, course: t.course, title: t.title, type: t.type, dueAt: new Date(t.dueAt), opensAt: t.opensAt === null ? null : new Date(t.opensAt) };
    const reminder = (id: string, at: number, push: { title: string; body: string }) => ({
      kind: 'reminder',
      id,
      taskId: t.id,
      at,
      title: push.title,
      body: push.body,
      dueAt: countdownTo,
      actionToken: actionToken(uid, t.id),
    });
    for (const [stage, date] of stageTimes(info)) {
      const at = date.getTime();
      if (ringing.has(stage) || at <= now || t.notifiedStages.includes(stage) || (t.snoozedUntil && at < t.snoozedUntil)) continue;
      alarms.push(reminder(`${t.id}:${stage}`, at, reminderPush(info, [stage], false, date)));
    }
    if (t.snoozedUntil && t.snoozedUntil > now) {
      alarms.push(reminder(`${t.id}:snooze-end`, t.snoozedUntil, reminderPush(info, [], true, new Date(t.snoozedUntil))));
    }
  }
  return Response.json({ now, alarmsOn: ring, alarms: alarms.sort((a, b) => a.at - b.at), pendingTaskIds }, { headers: { 'cache-control': 'no-store' } });
}
