'use client';

import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { LumeMark } from '../LumeMark';
import { deadline, useNow } from './time';
import { Tile } from './widgets';

const ease = [0.22, 1, 0.36, 1] as const;

function Feature({ title, body, className = '', dashed = false, children }: { title: string; body: string; className?: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.9, ease }}
      className={`flex flex-col overflow-hidden rounded-[26px] p-6 text-center sm:p-8 ${dashed ? 'border-2 border-dashed border-[#d9d9df] bg-transparent' : 'bg-white shadow-card'} ${className}`}
    >
      <div className="relative flex h-[250px] items-center justify-center">{children}</div>
      <h3 className="mt-6 text-[21px] font-medium tracking-[-0.02em]">{title}</h3>
      <p className="mx-auto mt-2 max-w-[36ch] text-[15px] text-ink-2">{body}</p>
    </motion.article>
  );
}

/** New LMS items arriving one after another. */
function SyncFragment() {
  const items = [
    { title: 'Tutorial 5', course: 'COA', tag: 'Assignment' },
    { title: 'Quiz 2', course: 'DSA', tag: 'Quiz' },
    { title: 'Assignment 3', course: 'Statistics', tag: 'Assignment' },
  ];
  return (
    <div className="w-full max-w-[300px] rounded-[18px] bg-[#f6f6f8] p-4 text-left shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">Manipal LMS</p>
        <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
          <motion.svg viewBox="0 0 16 16" className="size-3.5" animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }} aria-hidden>
            <path d="M13 8a5 5 0 11-1.5-3.6M13 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
          Syncing
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, x: -16, scale: 0.97 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 + i * 0.35, ease }}
            className="flex items-center justify-between rounded-[12px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgb(0_0_0/0.05)]"
          >
            <span className="text-[13px]">
              {it.title} <span className="text-ink-3">{it.course}</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${it.tag === 'Quiz' ? 'bg-orange/15 text-[#b45309]' : 'bg-cyan/15 text-[#0a86b3]'}`}>{it.tag}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** The reminder schedule for one deadline, beside a per-day chart and an on-time ring. */
function ScheduleFragment() {
  const now = useNow(60_000);
  const due = now ? deadline(now, 1).getTime() : 0;
  const H = 3_600_000;
  // Tutorial 5 is due tomorrow at 11:59 PM; three of its reminders.
  const rows = [
    { at: due - 24 * H, when: '24 hours before', time: '11:59 PM' },
    { at: due - 15 * H, when: 'Due today', time: '9:00 AM' },
    { at: due - 6 * H, when: '6 hours left', time: '5:59 PM' },
  ].map((r) => ({
    ...r,
    day: now ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(r.at) : '',
    date: now ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(r.at) : '',
  }));
  const bars = [
    { d: 'Wed', v: 0.8 },
    { d: 'Thu', v: 0.45 },
    { d: 'Fri', v: 0.65 },
  ];
  return (
    <div className="flex items-center gap-4">
      <div className="hidden w-[130px] rounded-[16px] bg-white p-3 shadow-card sm:block">
        <p className="text-left text-[11px] text-ink-3">Due per day</p>
        <div className="mt-2 flex h-[110px] items-end justify-between gap-2">
          {bars.map((b, i) => (
            <div key={b.d} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative h-[92px] w-full overflow-hidden rounded-[6px] bg-cyan/15">
                <motion.div
                  className="absolute inset-x-0 bottom-0 rounded-[6px] bg-cyan"
                  initial={{ height: 0 }}
                  whileInView={{ height: `${b.v * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 + i * 0.12, ease }}
                />
              </div>
              <span className="text-[10px] text-ink-3">{b.d}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-[240px] rounded-[18px] bg-[#f6f6f8] p-3 text-left shadow-card">
        <p className="px-1 text-[11px] text-ink-3">Reminders for Tutorial 5</p>
        <div className="mt-2 space-y-1.5">
          {rows.map((r, i) => (
            <motion.div
              key={r.when}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease }}
              className="flex items-center gap-2.5 rounded-[12px] bg-white p-2 shadow-[0_1px_2px_rgb(0_0_0/0.05)]"
            >
              <span className="flex w-8 flex-col items-center rounded-[8px] border border-line py-0.5 leading-none">
                <span className="text-[9px] text-ink-3">{r.day}</span>
                <span className="text-[14px] font-semibold">{r.date}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-medium">{r.when}</span>
                <span className="text-[11px] text-[#0a86b3]">{r.time}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="hidden rounded-[16px] bg-white p-3 shadow-card md:block">
        <p className="text-left text-[11px] text-ink-3">On time</p>
        <svg viewBox="0 0 100 100" className="mt-1 size-[96px]" aria-hidden>
          <circle cx="50" cy="50" r="38" fill="none" stroke="#eeeef2" strokeWidth="12" />
          <motion.circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="var(--color-orange)"
            strokeWidth="12"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 0.92 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, delay: 0.3, ease }}
          />
          <text x="50" y="55" textAnchor="middle" fontSize="17" fontWeight="600" fill="var(--color-ink)">
            92%
          </text>
        </svg>
      </div>
    </div>
  );
}

/** A reminder notification that gets marked done, on a loop, while it's on screen. */
function NotificationFragment() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduced = useReducedMotion();
  const [step, setStep] = useState<'show' | 'press' | 'done'>('show');

  useEffect(() => {
    if (!inView || reduced) return;
    const loop: ['show' | 'press' | 'done', number][] = [
      ['show', 2200],
      ['press', 350],
      ['done', 2200],
    ];
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      setStep(loop[i][0]);
      t = setTimeout(next, loop[i][1]);
      i = (i + 1) % loop.length;
    };
    next();
    return () => clearTimeout(t);
  }, [inView, reduced]);

  return (
    <div ref={ref} className="grid w-full max-w-[380px]">
      <AnimatePresence initial={false}>
        {step !== 'done' ? (
          <motion.div
            key="note"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 60, transition: { duration: 0.35 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="col-start-1 row-start-1 rounded-[22px] bg-white p-4 text-left shadow-float"
          >
            <div className="flex items-center gap-2 text-[12px] text-ink-3">
              <span className="grid size-5 place-items-center rounded-[6px] bg-ink">
                <LumeMark className="size-3.5 text-white" />
              </span>
              Lume, now
            </div>
            <p className="mt-2 font-semibold">Tutorial 5 is due in 1 hour</p>
            <p className="text-[14px] text-ink-2">Computer Organization and Architecture, 11:59 PM</p>
            <div className="mt-3 flex gap-2">
              <motion.span
                animate={step === 'press' ? { scale: 0.93, backgroundColor: '#1557c9' } : { scale: 1, backgroundColor: '#1d6ef5' }}
                className="rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-white"
              >
                Mark done
              </motion.span>
              <span className="rounded-[10px] bg-[#f0f0f3] px-3 py-1.5 text-[13px] font-medium">Remind in 2h</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="col-start-1 row-start-1 flex items-center gap-3 self-center justify-self-center rounded-full bg-white py-2.5 pl-2.5 pr-5 shadow-float"
          >
            <span className="grid size-8 place-items-center rounded-full bg-green">
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
                <motion.path
                  d="M5 10.5l3.2 3.2L15 7"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                />
              </svg>
            </span>
            <span className="text-[14px] font-medium">Marked done. Reminders stopped.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComingFragment() {
  return (
    <div className="relative h-[220px] w-[280px]">
      {[
        { label: 'NPTEL', glyph: 'N', color: '#f59e0b', live: true, className: 'left-0 top-8 -rotate-12' },
        { label: 'MUJ LMS', glyph: 'M', color: '#1d6ef5', live: true, className: 'right-0 top-8 rotate-12' },
      ].map((s) => (
        <div key={s.label} className={`absolute flex w-[118px] flex-col items-center gap-2 rounded-[18px] bg-white p-4 shadow-card ${s.className}`}>
          <Tile size={64}>
            <span className="text-[26px] font-bold" style={{ color: s.color }}>
              {s.glyph}
            </span>
          </Tile>
          <span className="text-[13px] font-medium">{s.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.live ? 'bg-green/12 font-medium text-green' : 'bg-[#f0f0f3] text-ink-2'}`}>{s.live ? 'Live' : 'Soon'}</span>
        </div>
      ))}
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <div className="bob">
          <Tile size={80}>
            <svg viewBox="0 0 32 32" className="size-9" aria-hidden>
              <rect x="4" y="7" width="24" height="18" rx="3.5" fill="#fff" stroke="#2a2a31" strokeWidth="2" />
              <path d="M5 9l11 8 11-8" fill="none" stroke="var(--color-red)" strokeWidth="2.2" strokeLinejoin="round" />
            </svg>
          </Tile>
        </div>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Feature className="lg:col-span-5" title="Fills itself in" body="Checks your Manipal LMS every hour and adds every new assignment and quiz. You never type a task in.">
        <SyncFragment />
      </Feature>
      <Feature className="lg:col-span-7" title="Reminders on a schedule" body="Reminders from two days before down to ten minutes before. The last ones stay on screen, and the Android app rings like an alarm.">
        <ScheduleFragment />
      </Feature>
      <Feature className="lg:col-span-7" title="Done from the notification" body="Tap Mark done without opening the app, and the rest of that task's reminders are cancelled.">
        <NotificationFragment />
      </Feature>
      <Feature className="lg:col-span-5" dashed title="NPTEL too" body="A small Chrome extension brings in your NPTEL assignments, next to your LMS deadlines.">
        <ComingFragment />
      </Feature>
    </div>
  );
}
