'use client';

import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useRef, useState } from 'react';
import type { TaskView } from '@/lib/tasks';
import { dayIST, istDayNumber, timeIST } from '@/lib/time';
import { CheckIcon, ClockIcon, OpenIcon } from './icons';
import { timeLeft } from './time';
import { SourceChip, TypeChip } from './ui';

const TONE = { calm: 'text-ink-2', soon: 'text-orange', urgent: 'text-red', late: 'text-red' };
const ease = [0.22, 1, 0.36, 1] as const;

export const TaskRow = memo(function TaskRow({
  task,
  now,
  focused,
  onDone,
  onSnooze,
}: {
  task: TaskView;
  now: number;
  focused: boolean;
  onDone: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  const [open, setOpen] = useState(focused);
  const [ticking, setTicking] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const sameDay = istDayNumber(task.dueAt) === istDayNumber(now);
  const snoozed = task.snoozedUntil && task.snoozedUntil > now;
  const opensLater = task.type === 'quiz' && task.opensAt && task.opensAt > now;

  // Arriving from a notification: bring this task into view.
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focused]);

  // Fill the check first, then let the row leave for the Done list.
  const tick = () => {
    if (ticking) return;
    setTicking(true);
    setTimeout(() => onDone(task.id), 420);
  };

  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.35, ease } }}
      className={`relative overflow-hidden border-b border-line last:border-0 ${focused ? 'rounded-[14px]' : ''}`}
    >
      {focused && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[14px] bg-blue/8 ring-2 ring-blue/40"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 2.2, duration: 1.2 }}
        />
      )}
      <div className="flex items-start gap-1 py-2.5">
        <button type="button" onClick={tick} aria-label={`Mark ${task.title} done`} className="grid size-11 shrink-0 place-items-center">
          <motion.span
            className="grid size-[22px] place-items-center rounded-full border-2"
            animate={ticking ? { backgroundColor: '#1d6ef5', borderColor: '#1d6ef5', scale: [1, 1.18, 1] } : { backgroundColor: 'rgba(0,0,0,0)', borderColor: 'var(--color-line)', scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.span initial={false} animate={{ opacity: ticking ? 1 : 0, scale: ticking ? 1 : 0.5 }} className="text-white">
              <CheckIcon className="size-3.5" />
            </motion.span>
          </motion.span>
        </button>

        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-w-0 flex-1 py-1.5 text-left">
          <span className={`relative block font-medium leading-snug transition-colors ${ticking ? 'text-ink-3' : ''}`}>
            {task.title}
            <motion.span className="absolute left-0 right-0 top-1/2 h-px origin-left bg-ink-3" initial={false} animate={{ scaleX: ticking ? 1 : 0 }} transition={{ duration: 0.3 }} />
          </span>
          <span className="block truncate text-[13px] text-ink-2">{task.course}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <TypeChip type={task.type} />
            <SourceChip source={task.source} />
            {snoozed && <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] text-ink-2">Snoozed till {timeIST(task.snoozedUntil!)}</span>}
            {opensLater && <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] text-ink-2">Opens {timeIST(task.opensAt!)}</span>}
          </span>
        </button>

        <div className="shrink-0 py-1.5 pr-1 text-right">
          <TimeLeft dueAt={task.dueAt} renderedAt={now} />
          <p className="text-[12px] text-ink-3">{timeIST(task.dueAt)}</p>
          {!sameDay && <p className="text-[12px] text-ink-3">{dayIST(task.dueAt)}</p>}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }}>
            <div className="flex flex-wrap gap-2 pb-3.5 pl-11">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={tick}
                className="flex h-10 items-center gap-1.5 rounded-[12px] bg-blue px-4 text-[13px] font-medium text-white shadow-[0_8px_18px_-10px_rgb(29_110_245/0.8)]"
              >
                <CheckIcon className="size-4" /> Mark done
              </motion.button>
              {task.dueAt > now && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSnooze(task.id)}
                  className="flex h-10 items-center gap-1.5 rounded-[12px] bg-chip px-4 text-[13px] font-medium"
                >
                  <ClockIcon className="size-4" /> Remind in 2h
                </motion.button>
              )}
              {task.url && (
                <a href={task.url} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-1.5 rounded-[12px] bg-chip px-4 text-[13px] font-medium">
                  <OpenIcon className="size-4" /> Open in LMS
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
});

/** Time left, ticking every second in the last hour and every 30 seconds before that. */
function TimeLeft({ dueAt, renderedAt }: { dueAt: number; renderedAt: number }) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      timer = setTimeout(tick, Math.abs(dueAt - n) < 3_600_000 ? 1000 : 30_000);
    };
    tick();
    return () => clearTimeout(timer);
  }, [dueAt]);
  const left = timeLeft(dueAt, now);
  return <p className={`text-[13px] font-semibold tabular-nums ${TONE[left.tone]}`}>{left.text}</p>;
}
