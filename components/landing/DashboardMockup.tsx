'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { LumeMark } from '../LumeMark';
import { PhoneMockup } from './PhoneMockup';
import { Tile } from './widgets';
import { dayFormat, deadline, hms, istHour, useNow } from './time';

const W = 1120;
const H = 700;

/** A preview of the Lume dashboard, drawn at desktop size and scaled to fit, tilting up into place on scroll. */
export function DashboardMockup() {
  const section = useRef<HTMLDivElement>(null);
  const fit = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / W)));
    ro.observe(fit.current!);
    return () => ro.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 22, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 80, 0]);

  return (
    <div ref={section} className="relative mx-3 rounded-[28px] bg-linear-to-b from-[#1fb5f2] via-[#8fdcfb] to-white px-4 pb-4 pt-12 sm:mx-4 sm:px-10 sm:pt-16 lg:px-16">
      {/* Phones see the phone version of the app; larger screens the desktop dashboard */}
      <div className="pb-8 sm:hidden">
        <PhoneMockup />
      </div>
      <div ref={fit} className="relative mx-auto hidden max-w-[1120px] [perspective:1600px] sm:block" style={{ height: H * scale }}>
        <motion.div style={{ rotateX, y, transformOrigin: '50% 100%' }} className="absolute inset-0">
          <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <Dashboard />
          </div>
        </motion.div>
      </div>

      {/* Floating tiles over the frame */}
      <div className="pointer-events-none absolute -left-2 top-1/3 hidden rotate-[-10deg] lg:block">
        <div className="bob">
          <CalendarTile />
        </div>
      </div>
      <div className="pointer-events-none absolute -right-3 top-24 hidden rotate-[10deg] lg:block">
        <div className="bob" style={{ '--float-delay': '-3s' } as React.CSSProperties}>
          <Tile size={84}>
            <span className="grid size-10 place-items-center rounded-[11px] bg-green shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]">
              <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
                <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Tile>
        </div>
      </div>
    </div>
  );
}

function CalendarTile() {
  const now = useNow(60_000);
  const date = now ? Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(deadline(now, 1))) : '';
  return (
    <Tile size={96}>
      <span className="text-[44px] font-medium leading-none tracking-[-0.04em]">{date}</span>
    </Tile>
  );
}

/* The dashboard itself, at 1120 × 700 */

const TODO = [
  { id: 'tut5', title: 'Tutorial 5', course: 'COA', done: false },
  { id: 'stats3', title: 'Assignment 3', course: 'Statistics', done: false },
  { id: 'rdbms', title: 'Assignment 1, RDBMS Theory', course: 'RDBMS', done: true },
  { id: 'java', title: 'Java Assignment', course: 'OOP', done: false },
];

function Dashboard() {
  const now = useNow(1000);
  const hour = now ? istHour(now) : 18;
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex h-full overflow-hidden rounded-[22px] bg-[#f6f6f8] text-left shadow-[0_40px_80px_-30px_rgb(10_60_110/0.45)] ring-1 ring-black/5">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col px-7 py-5">
        <header className="flex items-center justify-between text-[13px] text-ink-2">
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <rect x="2" y="3" width="12" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {now ? dayFormat.format(now) : ''}
          </span>
          <span className="flex items-center gap-5">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path d="M4 11V7a4 4 0 018 0v4l1.2 1.5H2.8zM6.5 14h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </span>
        </header>

        <div className="mt-6 flex items-end justify-between">
          <h3 className="text-[34px] font-medium tracking-[-0.03em]">
            {greeting}
          </h3>
          <span className="mb-1.5 flex items-center gap-2 rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-ink-2 shadow-card">
            <span className="size-1.5 rounded-full bg-green" />
            Synced from LMS 2 min ago
          </span>
        </div>

        {/* Laid out like the reference: to-do with the next reminder under it, two widgets up top, upcoming across the bottom. */}
        <div className="mt-5 grid min-h-0 flex-1 grid-cols-[260px_1fr_1.25fr] grid-rows-[auto_1fr] gap-4">
          <TodoCard />
          <NextDeadline now={now} />
          <ThisWeek />
          <ReminderCard />
          <Upcoming now={now} />
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const item = 'flex items-center justify-between rounded-[10px] px-3 py-2 text-[13px]';
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-white px-4 py-5">
      <div className="flex items-center gap-2 px-1 text-[17px] font-semibold tracking-[-0.02em]">
        <LumeMark className="size-5 text-ink" />
        Lume
      </div>
      <span className="mt-6 flex items-center gap-2 rounded-[10px] border border-line px-3 py-2 text-[13px] shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
          <path d="M13 8a5 5 0 11-1.5-3.6M13 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Sync now
      </span>
      <p className="mt-6 px-3 text-[12px] text-ink-3">Menu</p>
      <nav className="mt-1.5 space-y-0.5">
        <span className={`${item} bg-[#f0f0f3] font-medium`}>Home</span>
        <span className={item}>
          Tasks <span className="text-ink-3">3</span>
        </span>
        <span className={item}>
          Reminders <span className="text-ink-3">7</span>
        </span>
        <span className={item}>
          Done <span className="text-ink-3">12</span>
        </span>
      </nav>
      <p className="mt-6 px-3 text-[12px] text-ink-3">Sources</p>
      <div className="mt-1.5 space-y-0.5">
        <span className={item}>
          Manipal LMS <span className="size-1.5 rounded-full bg-green" />
        </span>
        <span className={item}>
          NPTEL <span className="size-1.5 rounded-full bg-green" />
        </span>
      </div>
    </aside>
  );
}

function Card({ title, className = '', children, action }: { title: string; className?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-[18px] bg-white p-5 shadow-card ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-[15px] font-semibold">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function TodoCard() {
  const [items, setItems] = useState(TODO);
  const reduced = useReducedMotion();

  // Tutorial 5 ticks itself off every few seconds, to show the check.
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setItems((xs) => xs.map((x) => (x.id === 'tut5' ? { ...x, done: !x.done } : x))), 2600);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <Card title="To do">
      <div className="mt-2 h-px bg-ink" />
      <ul className="mt-2">
        {items.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setItems((xs) => xs.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
              className="flex w-full items-start gap-3 border-b border-line py-2.5 text-left"
            >
              <motion.span
                className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border"
                animate={{ backgroundColor: t.done ? '#1d6ef5' : '#ffffff', borderColor: t.done ? '#1d6ef5' : '#cfcfd6' }}
                transition={{ duration: 0.25 }}
              >
                <svg viewBox="0 0 20 20" className="size-3" aria-hidden>
                  <motion.path
                    d="M5 10.5l3.2 3.2L15 7"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={false}
                    animate={{ pathLength: t.done ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </svg>
              </motion.span>
              <span className="min-w-0">
                <span className={`relative block text-[13px] leading-snug transition-colors duration-300 ${t.done ? 'text-ink-3' : ''}`}>
                  {t.title}
                  <motion.span
                    className="absolute inset-x-0 top-1/2 h-px origin-left bg-ink-3"
                    initial={false}
                    animate={{ scaleX: t.done ? 1 : 0 }}
                    transition={{ duration: 0.35 }}
                  />
                </span>
                <span className="text-[12px] text-ink-3">{t.course}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NextDeadline({ now }: { now: Date | null }) {
  const due = now ? deadline(now, 1) : null;
  return (
    <Card title="Next deadline">
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-[46px] font-medium tabular-nums tracking-[-0.03em]">{now && due ? hms(due.getTime() - now.getTime()) : '--:--:--'}</p>
        <p className="text-[13px] text-ink-2">Tutorial 5, COA</p>
        <div className="mt-4 flex gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-[#f0f0f3]" title="Remind in 2h">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <circle cx="8" cy="8.5" r="5.5" fill="none" stroke="#2a2a31" strokeWidth="1.5" />
              <path d="M8 6v2.7l1.8 1.1" fill="none" stroke="#2a2a31" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-blue" title="Mark done">
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
              <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </Card>
  );
}

function Ring({ r, value, color }: { r: number; value: number; color: string }) {
  return (
    <>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#eeeef2" strokeWidth="11" />
      <motion.circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="11"
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: value }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />
    </>
  );
}

function ThisWeek() {
  const stats = [
    { label: 'Tasks done', value: '4', of: '/7', color: 'bg-cyan' },
    { label: 'Quizzes done', value: '2', of: '/3', color: 'bg-orange' },
    { label: 'On time', value: '100', of: '%', color: 'bg-green' },
  ];
  return (
    <Card title="This week">
      <div className="mt-2 flex flex-1 items-center justify-between gap-4 rounded-[14px] border border-line px-4 py-3">
        <div className="space-y-2.5">
          {stats.map((s) => (
            <div key={s.label} className="flex gap-2.5">
              <span className={`w-0.5 rounded-full ${s.color}`} />
              <div>
                <p className="text-[11px] text-ink-3">{s.label}</p>
                <p className="text-[20px] font-medium leading-tight tracking-[-0.02em]">
                  {s.value}
                  <span className="text-ink-3">{s.of}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
        <svg viewBox="0 0 140 140" className="size-[140px] shrink-0" aria-hidden>
          <Ring r={60} value={4 / 7} color="var(--color-cyan)" />
          <Ring r={45} value={2 / 3} color="var(--color-orange)" />
          <Ring r={30} value={1} color="var(--color-green)" />
        </svg>
      </div>
    </Card>
  );
}

// The 24-hour reminder for a task due tomorrow at 11:59 PM fires today at 11:59 PM.
function ReminderCard() {
  return (
    <Card
      title="Next reminder"
      action={
        <span className="flex gap-1.5 text-ink-3">
          <span className="grid size-6 place-items-center rounded-full border border-line">‹</span>
          <span className="grid size-6 place-items-center rounded-full border border-line">›</span>
        </span>
      }
    >
      <div className="mt-3 flex flex-1 flex-col justify-center rounded-[14px] bg-[#f6f6f8] p-4">
        <p className="text-[12px] text-ink-3">Tutorial 5, COA</p>
        <p className="mt-0.5 font-semibold">24 hours before</p>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#0a86b3]">
          <span className="size-1.5 rounded-full bg-cyan" />
          Today, 11:59 PM
        </p>
      </div>
    </Card>
  );
}

function Upcoming({ now }: { now: Date | null }) {
  const rows = [
    { badge: 'bg-red', title: 'Tutorial 5', course: 'COA', days: 1, fill: 0.9, bar: 'bg-orange' },
    { badge: 'bg-orange', title: 'Assignment 3', course: 'Statistics', days: 6, fill: 0.45, bar: 'bg-cyan' },
    { badge: 'bg-cyan', title: 'Java Assignment', course: 'OOP', days: 38, fill: 0.12, bar: 'bg-cyan' },
  ];
  const short = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <Card title="Upcoming" className="col-span-2">
      <div className="mt-2 flex gap-5 border-b border-line text-[13px]">
        <span className="-mb-px border-b-2 border-blue pb-2 font-medium text-blue">Upcoming</span>
        <span className="pb-2 text-ink-3">Overdue</span>
        <span className="pb-2 text-ink-3">Done</span>
      </div>
      <div className="mt-2">
        {rows.map((r) => (
          <div key={r.title} className="flex items-center gap-4 py-2">
            <span className={`size-4 shrink-0 rounded-[5px] ${r.badge}`} />
            <span className="w-[190px] shrink-0 text-[13px]">
              {r.title} <span className="text-ink-3">{r.course}</span>
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-[#ececf0]">
              <motion.div
                className={`h-full rounded-full ${r.bar}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${r.fill * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="w-[92px] shrink-0 text-right text-[12px] text-ink-2">{now ? short.format(deadline(now, r.days)) : ''}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
