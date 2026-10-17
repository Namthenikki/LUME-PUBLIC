import type { Push } from './push';
import { type Stage, STAGES, STICKY_STAGES, sittingStart, stageTimes } from './stages';
import { formatIST, HOUR, windowIST } from './time';

type TaskInfo = { id: string; course: string; title: string; type: string; dueAt: Date; opensAt?: Date | null };

/** "Due Sat 17 Oct, 11:59 PM", or a quiz sitting's window: "Sat 17 Oct, 8:00 PM to 8:30 PM". */
function when(t: TaskInfo): string {
  const start = sittingStart(t);
  return start === null ? `Due ${formatIST(t.dueAt)}` : windowIST(start, t.dueAt);
}

const detail = (t: TaskInfo) => `${t.course}, ${t.title}. ${when(t)}.`;

const STAGE_TITLE: Record<Exclude<Stage, 'new'>, (t: TaskInfo) => string> = {
  '48h': () => 'Due in 2 days',
  '24h': () => 'Due tomorrow',
  dayof: () => 'Due today',
  '6h': () => '6 hours left',
  '3h': () => '3 hours left',
  '1h': () => '1 hour left',
  '30m': () => '30 minutes left',
  '10m': () => '10 minutes left',
  overdue: (t) => `Missed: ${t.title}`,
};

/** A quiz sitting counts down to its start. */
const SITTING_TITLE: Record<Exclude<Stage, 'new'>, (t: TaskInfo) => string> = {
  '48h': () => 'Quiz in 2 days',
  '24h': () => 'Quiz tomorrow',
  dayof: () => 'Quiz today',
  '6h': () => 'Starts in 6 hours',
  '3h': () => 'Starts in 3 hours',
  '1h': () => 'Starts in 1 hour',
  '30m': () => 'Starts in 30 minutes',
  '10m': () => 'Starts in 10 minutes',
  overdue: (t) => `Missed: ${t.title}`,
};

const STICKY = STICKY_STAGES;

function inWords(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours} hours` : `${Math.round(hours / 24)} days`;
}

function timeLeft(t: TaskInfo, now: Date): string {
  const minutesTo = (at: number) => Math.max(0, Math.round((at - now.getTime()) / 60_000));
  const start = sittingStart(t);
  if (start !== null && start > now.getTime()) return `Starts in ${inWords(minutesTo(start))}`;
  if (start !== null) return `Open now, ${inWords(minutesTo(t.dueAt.getTime()))} left`;
  const minutes = minutesTo(t.dueAt.getTime());
  return minutes >= 48 * 60 ? `Due in ${inWords(minutes)}` : `${inWords(minutes)} left`;
}

/**
 * One notification for everything due on a task: when several stages come due together
 * (say the job was down), the most urgent one sets the title.
 */
export function reminderPush(t: TaskInfo, stages: Stage[], snoozeEnded: boolean, now: Date): Push {
  const latest = STAGES.filter((s) => stages.includes(s)).at(-1);
  const overdue = latest === 'overdue';
  const start = sittingStart(t);
  // A stage sent well after its time ("Due tomorrow" arriving on the day) says the real time left instead.
  const latestAt = stageTimes(t).find(([s]) => s === latest)?.[1];
  const late = !overdue && latestAt !== undefined && now.getTime() - latestAt.getTime() > 20 * 60_000;
  const titles = start === null ? STAGE_TITLE : SITTING_TITLE;
  const remindAt = start ?? t.dueAt.getTime();
  return {
    taskId: t.id,
    title: latest && !late ? titles[latest](t) : timeLeft(t, now),
    body: overdue ? `${t.course}. It ${start === null ? 'was due' : 'closed'} ${formatIST(t.dueAt)}.` : detail(t),
    sticky: !overdue && (stages.some((s) => STICKY.includes(s)) || (snoozeEnded && remindAt - now.getTime() < 6 * HOUR)),
  };
}

export function newTaskPush(t: TaskInfo): Push {
  const kind = t.type === 'quiz' ? 'quiz' : t.type === 'assignment' ? 'assignment' : 'deadline';
  return { taskId: t.id, title: `New ${kind}: ${t.title}`, body: `${t.course}. ${when(t)}.` };
}

/** The time a task counts down to moved; `was` is the old one. */
export function deadlineChangedPush(t: TaskInfo, was: Date): Push {
  const sitting = sittingStart(t) !== null;
  return {
    taskId: t.id,
    title: `${sitting ? 'Quiz time' : 'Deadline'} changed: ${t.title}`,
    body: `${t.course}. Now ${sitting ? windowIST(sittingStart(t)!, t.dueAt) : `due ${formatIST(t.dueAt)}`}, was ${formatIST(was)}.`,
  };
}
