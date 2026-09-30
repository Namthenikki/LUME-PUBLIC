'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { BellIcon, ClockIcon, DoneIcon, HomeIcon, OpenIcon, SettingsIcon } from '../app/icons';
import { LumeMark } from '../LumeMark';
import { deadline, hms, istHour, useNow } from './time';

const ROWS = [
  { group: 'Tomorrow', dot: 'bg-blue', title: 'Tutorial 5', course: 'Computer Organization', left: '1d 0h', tone: 'text-ink-2', days: 1 },
  { group: 'This week', dot: 'bg-cyan', title: 'Assignment 3', course: 'Statistics and Probability', left: '6d 0h', tone: 'text-ink-2', days: 6 },
  { group: 'Later', dot: 'bg-ink-3', title: 'Java Assignment', course: 'Object Oriented Programming', left: '38 days', tone: 'text-ink-2', days: 38 },
];

/** The phone version of the dashboard, in a phone frame, for the landing page on small screens. */
export function PhoneMockup() {
  const now = useNow(1000);
  const reduced = useReducedMotion();
  const [note, setNote] = useState(false);

  // A reminder drops in from the top every few seconds.
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setNote((n) => !n), 3200);
    return () => clearInterval(id);
  }, [reduced]);

  const due = now ? deadline(now, 1) : null;
  const hour = now ? istHour(now) : 18;
  const clockNow = now ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now) : '';
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto w-[292px] rounded-[46px] bg-[#0e0e11] p-[9px] shadow-[0_40px_70px_-30px_rgb(10_60_110/0.55)]">
      <div className="relative h-[596px] overflow-hidden rounded-[38px] bg-panel text-left">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold">
          <span>{clockNow}</span>
          <span className="h-4 w-16 rounded-full bg-[#0e0e11]" />
          <span className="flex gap-1">
            <span className="h-2 w-3 rounded-[2px] bg-ink" />
            <span className="h-2 w-4 rounded-[2px] bg-ink" />
          </span>
        </div>

        {/* Heads-up reminder */}
        <AnimatePresence>
          {note && (
            <motion.div
              initial={{ y: -90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -90, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="absolute inset-x-2.5 top-8 z-20 rounded-[18px] bg-white/95 p-3 shadow-float backdrop-blur"
            >
              <p className="flex items-center gap-1.5 text-[10px] text-ink-3">
                <span className="grid size-4 place-items-center rounded-[5px] bg-ink">
                  <LumeMark className="size-3 text-white" />
                </span>
                Lume, now
              </p>
              <p className="mt-1 text-[12px] font-semibold">Tutorial 5 is due tomorrow</p>
              <p className="text-[11px] text-ink-2">Computer Organization, 11:59 PM</p>
              <div className="mt-2 flex gap-1.5 text-[10px] font-semibold">
                <span className="rounded-[8px] bg-blue px-2 py-1 text-white">Mark done</span>
                <span className="rounded-[8px] bg-chip px-2 py-1">Remind in 2h</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 pt-3">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold">
            <LumeMark className="size-4" /> Lume
          </p>
          <p className="mt-3 text-[21px] font-medium leading-tight tracking-[-0.03em]">
            {greeting}
          </p>

          <div className="mt-3 rounded-[16px] bg-white p-3.5 text-center shadow-card">
            <p className="text-left text-[11px] font-semibold">Next deadline</p>
            <p className="mt-1 text-[30px] font-medium tabular-nums tracking-[-0.04em]">{now && due ? hms(due.getTime() - now.getTime()) : '--:--:--'}</p>
            <p className="text-[12px] font-semibold">Tutorial 5</p>
            <p className="text-[10px] text-ink-2">Computer Organization and Architecture</p>
            <div className="mt-2 flex justify-center gap-1.5">
              <span className="grid size-7 place-items-center rounded-full bg-chip">
                <ClockIcon className="size-3.5" />
              </span>
              <span className="rounded-[8px] bg-blue px-3 py-1.5 text-[10px] font-semibold text-white">Mark done</span>
              <span className="grid size-7 place-items-center rounded-full bg-chip">
                <OpenIcon className="size-3.5" />
              </span>
            </div>
          </div>

          <p className="mt-3 text-[13px] font-medium">Your deadlines</p>
          <div className="mt-1.5 space-y-2">
            {ROWS.map((r) => (
              <div key={r.title} className="rounded-[14px] bg-white px-3 py-2 shadow-card">
                <p className="flex items-center gap-1.5 text-[9px] font-semibold">
                  <span className={`size-1.5 rounded-full ${r.dot}`} />
                  {r.group}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="size-3.5 shrink-0 rounded-full border-[1.5px] border-line" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium">{r.title}</span>
                    <span className="block truncate text-[9px] text-ink-2">{r.course}</span>
                  </span>
                  <span className={`text-[10px] font-semibold ${r.tone}`}>{r.left}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-4 border-t border-line bg-white/90 pb-3 pt-2 text-center text-[9px] font-medium text-ink-3">
          {[
            { t: 'Home', Icon: HomeIcon },
            { t: 'Reminders', Icon: BellIcon },
            { t: 'Done', Icon: DoneIcon },
            { t: 'Settings', Icon: SettingsIcon },
          ].map(({ t, Icon }, i) => (
            <span key={t} className={i === 0 ? 'text-blue' : ''}>
              <Icon className="mx-auto mb-0.5 size-4" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
