'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type CSSProperties, useEffect, useState } from 'react';
import type { TaskView } from '@/lib/tasks';
import { upcomingReminders } from '@/lib/stages';
import { dayIST, formatIST, istDayNumber, timeIST } from '@/lib/time';
import { CheckTile } from '../landing/widgets';
import { CheckIcon, ChevronIcon, ClockIcon, OpenIcon } from './icons';
import { Panel, SourceChip, TypeChip } from './ui';

const ease = [0.22, 1, 0.36, 1] as const;

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  if (h >= 100) return `${Math.floor(h / 24)} days`;
  return [h, Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

/** The big countdown: the only part of Home that updates every second. */
function LiveClock({ dueAt, renderedAt }: { dueAt: number; renderedAt: number }) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{clock(dueAt - now)}</>;
}

/** The soonest pending deadline, with a live countdown and its actions. */
export function NextDeadline({
  task,
  now,
  onDone,
  onSnooze,
}: {
  task: TaskView | undefined;
  now: number;
  onDone: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  if (!task) {
    return (
      <Panel title="Next deadline">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <CheckTile />
          <p className="font-medium">Nothing due right now</p>
          <p className="text-[14px] text-ink-2">New assignments show up here as soon as they’re on the LMS.</p>
        </div>
      </Panel>
    );
  }
  const snoozed = task.snoozedUntil && task.snoozedUntil > now;
  const urgent = task.dueAt - now < 3 * 3_600_000;
  return (
    <Panel title="Next deadline" action={<TypeChip type={task.type} />}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease }}
          className="flex flex-1 flex-col items-center justify-center text-center"
        >
          <p className={`text-[clamp(2.6rem,12vw,3.4rem)] font-medium leading-none tabular-nums tracking-[-0.04em] ${urgent ? 'text-red' : ''}`}>
            <LiveClock dueAt={task.dueAt} renderedAt={now} />
          </p>
          <p className="mt-3 font-semibold">{task.title}</p>
          <p className="text-[14px] text-ink-2">{task.course}</p>
          <p className="mt-1 text-[13px] text-ink-3">Due {formatIST(task.dueAt)}</p>
          {snoozed && (
            <span className="mt-2 rounded-full bg-chip px-2.5 py-1 text-[12px] text-ink-2">Snoozed until {timeIST(task.snoozedUntil!)}</span>
          )}
          <div className="mt-4 flex items-center gap-2.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onSnooze(task.id)}
              aria-label="Remind me in 2 hours"
              title="Remind in 2h"
              className="grid size-11 place-items-center rounded-full bg-chip text-ink"
            >
              <ClockIcon className="size-5" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onDone(task.id)}
              className="flex h-11 items-center gap-2 rounded-[12px] bg-blue px-5 text-[14px] font-medium text-white shadow-[0_10px_24px_-10px_rgb(29_110_245/0.8)]"
            >
              <CheckIcon className="size-4" />
              Mark done
            </motion.button>
            {task.url && (
              <a
                href={task.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in the LMS"
                title="Open in the LMS"
                className="grid size-11 place-items-center rounded-full bg-chip text-ink"
              >
                <OpenIcon className="size-5" />
              </a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </Panel>
  );
}

/**
 * One progress ring. The value is drawn straight into the markup (dash offset along the
 * circumference); CSS only animates it in, so the ring is right even before scripts run.
 */
function Ring({ r, value, color }: { r: number; value: number; color: string }) {
  const length = 2 * Math.PI * r;
  return (
    <>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-chip)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        strokeDasharray={length}
        className="ring-fill"
        style={{ strokeDashoffset: length * (1 - Math.min(Math.max(value, 0), 1)), opacity: value > 0 ? 1 : 0, '--ring-length': length } as CSSProperties}
      />
    </>
  );
}

/** Progress for this IST week (Monday to Sunday). */
export function ThisWeek({ tasks, now }: { tasks: TaskView[]; now: number }) {
  const today = istDayNumber(now);
  const weekday = (new Date(now + 5.5 * 3_600_000).getUTCDay() + 6) % 7;
  const inWeek = tasks.filter((t) => t.status !== 'cancelled' && istDayNumber(t.dueAt) >= today - weekday && istDayNumber(t.dueAt) <= today - weekday + 6);
  const done = inWeek.filter((t) => t.status === 'done');
  const quizzes = inWeek.filter((t) => t.type === 'quiz');
  const onTime = done.filter((t) => t.doneAt !== null && t.doneAt <= t.dueAt);
  const stats = [
    { label: 'Tasks done', value: done.length, of: inWeek.length, color: 'var(--color-cyan)' },
    { label: 'Quizzes done', value: quizzes.filter((t) => t.status === 'done').length, of: quizzes.length, color: 'var(--color-orange)' },
    { label: 'On time', value: onTime.length, of: done.length, color: 'var(--color-green)' },
  ];

  return (
    <Panel title="This week">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between sm:rounded-[14px] sm:border sm:border-line sm:px-4 sm:py-3">
        <div className="hidden space-y-2 sm:block">
          {stats.map((s) => (
            <div key={s.label} className="flex gap-2.5">
              <span className="w-0.5 rounded-full" style={{ background: s.color }} />
              <div>
                <p className="text-[11px] text-ink-3">{s.label}</p>
                <p className="text-[19px] font-medium leading-tight tracking-[-0.02em] tabular-nums">
                  {s.value}
                  <span className="text-ink-3">/{s.of}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
        <svg viewBox="0 0 120 120" className="size-[104px] shrink-0 sm:size-[128px]" aria-hidden>
          {stats.map((s, i) => (
            <Ring key={s.label} r={52 - i * 13} value={s.of ? s.value / s.of : 0} color={s.color} />
          ))}
        </svg>
        <p className="text-[13px] text-ink-2 sm:hidden">
          <span className="font-semibold text-ink tabular-nums">
            {done.length}/{inWeek.length}
          </span>{' '}
          done
        </p>
      </div>
    </Panel>
  );
}

/** The reminders still to come, one at a time. */
export function NextReminder({ tasks, now }: { tasks: TaskView[]; now: number }) {
  const upcoming = upcomingReminders(tasks, now).slice(0, 8);
  const [index, setIndex] = useState(0);
  const i = Math.min(index, Math.max(upcoming.length - 1, 0));
  const r = upcoming[i];
  const when = r ? (istDayNumber(r.at) === istDayNumber(now) ? 'Today' : istDayNumber(r.at) === istDayNumber(now) + 1 ? 'Tomorrow' : dayIST(r.at)) : '';

  const step = (d: number) => (
    <button
      type="button"
      onClick={() => setIndex(Math.min(Math.max(i + d, 0), upcoming.length - 1))}
      disabled={d < 0 ? i === 0 : i >= upcoming.length - 1}
      aria-label={d < 0 ? 'Previous reminder' : 'Next reminder'}
      className="grid size-8 place-items-center rounded-full border border-line text-ink-2 disabled:opacity-35"
    >
      <ChevronIcon className={`size-4 ${d < 0 ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <Panel
      title="Next reminder"
      action={upcoming.length > 1 && <span className="hidden gap-1.5 sm:flex">{[step(-1), step(1)].map((b, k) => <span key={k}>{b}</span>)}</span>}
    >
      {/* On phones there's no room for arrows: tap the card to see the next one. */}
      <button
        type="button"
        onClick={() => setIndex(i + 1 < upcoming.length ? i + 1 : 0)}
        disabled={upcoming.length < 2}
        aria-label="Show the next reminder"
        className="relative flex flex-1 flex-col justify-center overflow-hidden rounded-[14px] bg-sunken p-3.5 text-left sm:pointer-events-none sm:p-4"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {r ? (
            <motion.div key={`${r.taskId}-${r.at}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease }}>
              <p className="truncate text-[12px] text-ink-3">
                {r.title}, {r.course}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold leading-snug sm:text-[16px]">{r.label}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#0a86b3] dark:text-cyan">
                <span className="size-1.5 rounded-full bg-cyan" />
                {when}, {timeIST(r.at)}
              </p>
            </motion.div>
          ) : (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[14px] text-ink-2">
              No reminders scheduled.
            </motion.p>
          )}
        </AnimatePresence>
        {upcoming.length > 1 && <span className="mt-2 text-[11px] text-ink-3 sm:hidden">{i + 1} of {upcoming.length}, tap for next</span>}
      </button>
    </Panel>
  );
}
