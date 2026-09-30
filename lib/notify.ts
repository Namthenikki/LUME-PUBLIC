import type { Push } from './push';
import { type Stage, STAGES, STICKY_STAGES, stageTimes } from './stages';
import { formatIST, HOUR } from './time';

type TaskInfo = { id: string; course: string; title: string; type: string; dueAt: Date };

const detail = (t: TaskInfo) => `${t.course}, ${t.title}. Due ${formatIST(t.dueAt)}.`;

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

const STICKY = STICKY_STAGES;

function timeLeft(t: TaskInfo, now: Date): string {
  const minutes = Math.max(0, Math.round((t.dueAt.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} minutes left`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours} hours left` : `Due in ${Math.round(hours / 24)} days`;
}

/**
 * One notification for everything due on a task: when several stages come due together
 * (say the job was down), the most urgent one sets the title.
 */
export function reminderPush(t: TaskInfo, stages: Stage[], snoozeEnded: boolean, now: Date): Push {
  const latest = STAGES.filter((s) => stages.includes(s)).at(-1);
  const overdue = latest === 'overdue';
  // A stage sent well after its time ("Due tomorrow" arriving on the day) says the real time left instead.
  const latestAt = stageTimes(t.dueAt).find(([s]) => s === latest)?.[1];
  const late = !overdue && latestAt !== undefined && now.getTime() - latestAt.getTime() > 20 * 60_000;
  return {
    taskId: t.id,
    title: latest && !late ? STAGE_TITLE[latest](t) : timeLeft(t, now),
    body: overdue ? `${t.course}. It was due ${formatIST(t.dueAt)}.` : detail(t),
    sticky: !overdue && (stages.some((s) => STICKY.includes(s)) || (snoozeEnded && t.dueAt.getTime() - now.getTime() < 6 * HOUR)),
  };
}

export function newTaskPush(t: TaskInfo): Push {
  const kind = t.type === 'quiz' ? 'quiz' : t.type === 'assignment' ? 'assignment' : 'deadline';
  return { taskId: t.id, title: `New ${kind}: ${t.title}`, body: `${t.course}. Due ${formatIST(t.dueAt)}.` };
}

export function deadlineChangedPush(t: TaskInfo, was: Date): Push {
  return { taskId: t.id, title: `Deadline changed: ${t.title}`, body: `${t.course}. Now due ${formatIST(t.dueAt)}, was ${formatIST(was)}.` };
}
