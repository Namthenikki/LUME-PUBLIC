'use client';

import { useEffect, useState } from 'react';

/** The current time in ms, ticking. Null during the server render so nothing mismatches on hydration. */
export function useNow(every = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}

/** "2 min ago", "3 h ago", "just now". */
export function ago(then: number, now: number): string {
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86_400)} d ago`;
}

/** Time left until a deadline, as shown on task rows. */
export function timeLeft(dueAt: number, now: number): { text: string; tone: 'calm' | 'soon' | 'urgent' | 'late' } {
  const ms = dueAt - now;
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  if (ms < 0) return { text: d ? `${d}d ${h}h late` : h ? `${h}h ${m}m late` : `${m}m late`, tone: 'late' };
  if (ms < 3_600_000) return { text: `${m}m ${String(s).padStart(2, '0')}s`, tone: 'urgent' };
  if (ms < 3 * 3_600_000) return { text: `${h}h ${m}m`, tone: 'urgent' };
  if (ms < 86_400_000) return { text: `${h}h ${m}m`, tone: 'soon' };
  if (d < 7) return { text: `${d}d ${h}h`, tone: 'calm' };
  return { text: `${d} days`, tone: 'calm' };
}

export function greeting(now: number): string {
  const hour = new Date(now + 5.5 * 3_600_000).getUTCHours();
  return hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}
