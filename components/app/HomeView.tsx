'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useOptimistic, useState, useTransition } from 'react';
import { markDoneAction, snoozeAction, undoDoneAction } from '@/app/dashboard/actions';
import type { Source } from '@/lib/sources/types';
import type { TaskView } from '@/lib/tasks';
import { dayIST, istDayNumber } from '@/lib/time';
import { CheckTile } from '../landing/widgets';
import { ChevronIcon } from './icons';
import { GetAppCard } from './GetAppCard';
import { NotificationPrompt } from './NotificationPrompt';
import { TopBar } from './Shell';
import { TaskRow } from './TaskRow';
import { greeting, timeLeft, useNow } from './time';
import { SOURCE_NAME } from './ui';
import { NextDeadline, NextReminder, ThisWeek } from './Widgets';

type Group = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later';
const GROUPS: { id: Group; label: string; dot: string }[] = [
  { id: 'overdue', label: 'Overdue', dot: 'bg-red' },
  { id: 'today', label: 'Today', dot: 'bg-orange' },
  { id: 'tomorrow', label: 'Tomorrow', dot: 'bg-blue' },
  { id: 'week', label: 'This week', dot: 'bg-cyan' },
  { id: 'later', label: 'Later', dot: 'bg-ink-3' },
];

function groupOf(dueAt: number, now: number): Group {
  if (dueAt < now) return 'overdue';
  const days = istDayNumber(dueAt) - istDayNumber(now);
  return days === 0 ? 'today' : days === 1 ? 'tomorrow' : days < 7 ? 'week' : 'later';
}

type Patch = { id: string; changes: Partial<TaskView> };

export function HomeView({
  tasks,
  renderedAt,
  focusId,
  apkReady,
  nptelAlert,
}: {
  tasks: TaskView[];
  renderedAt: number;
  focusId: string | null;
  apkReady: boolean;
  nptelAlert: string | null;
}) {
  // Grouping and labels only need a coarse clock; the countdowns tick on their own (TaskRow, Widgets).
  const now = useNow(30_000) ?? renderedAt;
  const [items, patch] = useOptimistic(tasks, (state, p: Patch) => state.map((t) => (t.id === p.id ? { ...t, ...p.changes } : t)));
  const [, start] = useTransition();
  const [source, setSource] = useState<Source | 'all'>('all');
  const [showDone, setShowDone] = useState(false);

  // Stable callbacks, so memoized task rows don't re-render when the parent does.
  const act = useCallback(
    (id: string, changes: Partial<TaskView>, action: (id: string) => Promise<void>) =>
      start(async () => {
        patch({ id, changes });
        await action(id);
      }),
    [patch, start],
  );
  const done = useCallback((id: string) => act(id, { status: 'done', doneAt: Date.now(), snoozedUntil: null }, markDoneAction), [act]);
  const undo = useCallback((id: string) => act(id, { status: 'pending', doneAt: null }, undoDoneAction), [act]);
  const snooze = useCallback((id: string) => act(id, { snoozedUntil: Date.now() + 2 * 3_600_000 }, snoozeAction), [act]);

  const sources = [...new Set(items.map((t) => t.source))];
  const shown = items.filter((t) => source === 'all' || t.source === source);
  const pending = shown.filter((t) => t.status === 'pending');
  const finished = shown.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const next = items.find((t) => t.status === 'pending' && t.dueAt > now);
  const overdue = pending.filter((t) => t.dueAt < now).length;

  const summary = pending.length
    ? `${pending.length} ${pending.length === 1 ? 'deadline' : 'deadlines'} pending${overdue ? `, ${overdue} overdue` : ''}.${next ? ` Next one in ${timeLeft(next.dueAt, now).text}.` : ''}`
    : 'Nothing pending. Enjoy the quiet.';

  return (
    <div className="space-y-5 lg:space-y-6">
      <TopBar />

      <motion.header initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <h1 className="text-[clamp(1.9rem,6vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.03em]">
          {greeting(now)}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-2">{summary}</p>
      </motion.header>

      <NotificationPrompt />
      <GetAppCard apkReady={apkReady} />
      {nptelAlert && (
        <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-[20px] bg-card p-4 shadow-card ring-1 ring-orange/40">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-orange/15 text-[17px] font-bold text-[#b45309] dark:text-orange">N</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">NPTEL isn’t syncing</span>
            <span className="block text-[13px] leading-snug text-ink-2">{nptelAlert}</span>
          </span>
          <ChevronIcon className="size-4 shrink-0 text-ink-3" />
        </Link>
      )}

      <motion.div
        className="grid gap-3 sm:gap-4 lg:grid-cols-[1.15fr_1fr_1fr]"
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.08 } } }}
      >
        {[
          <NextDeadline key="next" task={next} now={now} onDone={done} onSnooze={snooze} />,
          <div key="pair" className="grid grid-cols-2 gap-3 sm:gap-4 lg:contents">
            <ThisWeek tasks={items} now={now} />
            <NextReminder tasks={items} now={now} />
          </div>,
        ].map((el, i) => (
          <motion.div
            key={i}
            className={i === 1 ? 'lg:contents' : 'flex *:flex-1'}
            variants={{ hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
          >
            {el}
          </motion.div>
        ))}
      </motion.div>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[20px] font-medium tracking-[-0.02em]">Your deadlines</h2>
          {sources.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" role="radiogroup" aria-label="Filter by source">
              {(['all', ...sources] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={source === s}
                  onClick={() => setSource(s)}
                  className={`relative h-10 shrink-0 rounded-[12px] px-4 text-[13px] font-medium transition-colors ${source === s ? 'text-white' : 'bg-card text-ink-2 shadow-card'}`}
                >
                  {source === s && <motion.span layoutId="source-pill" className="absolute inset-0 rounded-[12px] bg-blue shadow-[0_8px_18px_-10px_rgb(29_110_245/0.8)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <span className={`relative ${source === s ? 'text-white' : ''}`}>{s === 'all' ? 'All' : SOURCE_NAME[s]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-[20px] bg-card px-6 py-12 text-center shadow-card">
            <CheckTile />
            <p className="mt-2 font-semibold">You’re all caught up</p>
            <p className="max-w-[34ch] text-[14px] text-ink-2">Lume checks the LMS every hour. New assignments and quizzes will appear here on their own.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {GROUPS.map((g) => {
              const list = pending.filter((t) => groupOf(t.dueAt, now) === g.id);
              if (!list.length) return null;
              return (
                <motion.section key={g.id} className={`rounded-[20px] bg-card px-3 pt-3 shadow-card sm:px-4 ${g.id === 'overdue' ? 'ring-1 ring-red/30' : ''}`}>
                  <h3 className="flex items-center gap-2 px-2 pt-1 text-[13px] font-semibold">
                    <span className={`size-2 rounded-full ${g.dot}`} />
                    <span className={g.id === 'overdue' ? 'text-red' : ''}>{g.label}</span>
                    <span className="font-normal text-ink-3">{list.length}</span>
                  </h3>
                  <ul>
                    <AnimatePresence initial={false}>
                      {list.map((t) => (
                        <TaskRow key={t.id} task={t} now={now} focused={t.id === focusId} onDone={done} onSnooze={snooze} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </motion.section>
              );
            })}
          </div>
        )}

        {finished.length > 0 && (
          <div className="mt-4 rounded-[20px] bg-card shadow-card">
            <button type="button" onClick={() => setShowDone((s) => !s)} aria-expanded={showDone} className="flex h-14 w-full items-center gap-2 px-5 text-left text-[14px] font-semibold">
              <motion.span animate={{ rotate: showDone ? 90 : 0 }} className="grid">
                <ChevronIcon className="size-4 text-ink-3" />
              </motion.span>
              Done
              <span className="font-normal text-ink-3">{finished.length}</span>
            </button>
            <AnimatePresence initial={false}>
              {showDone && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-5">
                  {finished.slice(0, 15).map((t) => (
                    <li key={t.id} className="flex items-center gap-3 border-t border-line py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] text-ink-3 line-through">{t.title}</p>
                        <p className="truncate text-[12px] text-ink-3">
                          {t.course}
                          {t.doneAt ? `, done ${dayIST(t.doneAt)}` : ''}
                        </p>
                      </div>
                      <button type="button" onClick={() => undo(t.id)} className="h-9 shrink-0 rounded-[12px] bg-chip px-3.5 text-[13px] font-medium">
                        Undo
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
