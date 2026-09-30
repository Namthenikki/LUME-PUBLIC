'use client';

import { useEffect, useState } from 'react';

const IST = 5.5 * 3_600_000;

/** 11:59 PM IST, `days` days from `now`. The demo content is always relative to today. */
export function deadline(now: Date, days: number): Date {
  const ist = new Date(now.getTime() + IST);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + days, 23, 59, 59) - IST);
}

export function hms(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

export function istHour(now: Date): number {
  return new Date(now.getTime() + IST).getUTCHours();
}

export const dayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/** The current time, ticking. Null during the server render, so nothing time-based mismatches on hydration. */
export function useNow(every = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}
