import { HOUR, IST_OFFSET } from './time';

/** Reminder stages after `new`, in firing order. */
export const STAGES = ['48h', '24h', 'dayof', '6h', '3h', '1h', '30m', '10m', 'overdue'] as const;
export type Stage = 'new' | (typeof STAGES)[number];

/** Stages that stay on screen until acted on. The Android app also rings an alarm at ALARM_STAGES. */
export const STICKY_STAGES: Stage[] = ['6h', '3h', '1h', '30m', '10m'];
export const ALARM_STAGES = [
  { stage: '12h', minutes: 12 * 60 },
  { stage: '6h', minutes: 6 * 60 },
  { stage: '30m', minutes: 30 },
  { stage: '10m', minutes: 10 },
] as const;

export const STAGE_LABEL: Record<(typeof STAGES)[number], string> = {
  '48h': '48 hours before',
  '24h': '24 hours before',
  dayof: '9 AM on the day',
  '6h': '6 hours before',
  '3h': '3 hours before',
  '1h': '1 hour before',
  '30m': '30 minutes before',
  '10m': '10 minutes before',
  overdue: 'Right after the deadline',
};

/** The same stages for a quiz sitting, which count down to its start. */
const SITTING_LABEL: Record<(typeof STAGES)[number], string> = {
  ...STAGE_LABEL,
  '48h': '48 hours before it starts',
  '24h': '24 hours before it starts',
  '6h': '6 hours before it starts',
  '3h': '3 hours before it starts',
  '1h': '1 hour before it starts',
  '30m': '30 minutes before it starts',
  '10m': '10 minutes before it starts',
  overdue: 'When it closes',
};

/** Anything with a deadline, and maybe an opening time, as a Date or epoch ms. */
export type Timed = { type: string; dueAt: Date | number; opensAt?: Date | number | null };

/** The longest quiz window that is a sitting (8:00 to 8:30 PM) rather than a deadline to finish by. */
const SITTING_MAX = 6 * HOUR;

/**
 * When a quiz sitting starts: a quiz that opens and closes within a few hours, like 8:00 to 8:30 PM,
 * has to be taken at its start, so that's what its reminders and alarms count down to. Null for
 * everything else, which counts down to its deadline (a quiz open all week included).
 */
export function sittingStart(t: Timed): number | null {
  if (t.type !== 'quiz' || t.opensAt === null || t.opensAt === undefined) return null;
  const opens = +t.opensAt;
  const due = +t.dueAt;
  return opens < due && due - opens <= SITTING_MAX ? opens : null;
}

/** The moment a task's reminders count down to: a quiz sitting's start, else its deadline. */
export const remindAt = (t: Timed): number => sittingStart(t) ?? +t.dueAt;

/**
 * When each stage fires. The stages before the deadline count down to `remindAt` (a sitting's start);
 * `dayof` is 9:00 AM IST on that day, if that is before it; `overdue` is the deadline itself.
 */
export function stageTimes(t: Timed): [(typeof STAGES)[number], Date][] {
  const at = remindAt(t);
  const dayStart = Math.floor((at + IST_OFFSET) / (24 * HOUR)) * 24 * HOUR - IST_OFFSET;
  const offsets: Record<(typeof STAGES)[number], number> = {
    '48h': at - 48 * HOUR,
    '24h': at - 24 * HOUR,
    dayof: dayStart + 9 * HOUR,
    '6h': at - 6 * HOUR,
    '3h': at - 3 * HOUR,
    '1h': at - HOUR,
    '30m': at - 30 * 60_000,
    '10m': at - 10 * 60_000,
    overdue: +t.dueAt,
  };
  return STAGES.filter((s) => s !== 'dayof' || offsets.dayof < at).map((s) => [s, new Date(offsets[s])]);
}

/** Stages already in the past when a deadline is first seen; they are recorded as fired so they never fire late. */
export function pastStages(t: Timed, now: Date): Stage[] {
  return stageTimes(t)
    .filter(([, at]) => at <= now)
    .map(([stage]) => stage);
}

/**
 * When the next reminder is due across a student's pending tasks: the earliest stage not sent yet, or
 * a snooze ending. It may already be past (then it's due now). Null when nothing is left to send.
 */
export function nextReminderAt(tasks: (Timed & { notifiedStages: Stage[]; snoozedUntil: number | null })[]): number | null {
  let next: number | null = null;
  for (const t of tasks) {
    const times = t.snoozedUntil !== null
      ? [t.snoozedUntil]
      : stageTimes(t)
          .filter(([stage]) => !t.notifiedStages.includes(stage))
          .map(([, at]) => at.getTime());
    for (const at of times) if (next === null || at < next) next = at;
  }
  return next;
}

type Remindable = {
  id: string;
  title: string;
  course: string;
  type: string;
  dueAt: number;
  opensAt: number | null;
  status: string;
  notifiedStages: Stage[];
  snoozedUntil: number | null;
};

export type UpcomingReminder = { taskId: string; title: string; course: string; at: number; label: string; stage: Stage | 'snooze' };

/** Every reminder still to come, soonest first. A snoozed task's reminders wait for its snooze to end. */
export function upcomingReminders(tasks: Remindable[], now: number): UpcomingReminder[] {
  const out: UpcomingReminder[] = [];
  for (const t of tasks) {
    if (t.status !== 'pending') continue;
    const snoozed = t.snoozedUntil && t.snoozedUntil > now ? t.snoozedUntil : null;
    if (snoozed) out.push({ taskId: t.id, title: t.title, course: t.course, at: snoozed, label: 'When the snooze ends', stage: 'snooze' });
    const labels = sittingStart(t) === null ? STAGE_LABEL : SITTING_LABEL;
    for (const [stage, at] of stageTimes(t)) {
      const time = at.getTime();
      if (time <= now || t.notifiedStages.includes(stage) || (snoozed && time <= snoozed)) continue;
      out.push({ taskId: t.id, title: t.title, course: t.course, at: time, label: labels[stage], stage });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** What a countdown shows: a quiz sitting's start until it opens, then its close; else the deadline. */
export function countdownTo(t: Timed, now: number): number {
  const start = sittingStart(t);
  return start !== null && now < start ? start : +t.dueAt;
}
