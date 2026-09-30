import { IST_OFFSET } from './time';

/**
 * Sleep time, in IST: no alarms ring, and notifications arrive silently (no sound, no vibration).
 * The Android app has the same window (QUIET_START_HOUR / QUIET_END_HOUR in Alarms.java).
 */
export const QUIET_HOURS = { start: 0, end: 8 };

export function isQuiet(ms: number): boolean {
  const hour = new Date(ms + IST_OFFSET).getUTCHours();
  return hour >= QUIET_HOURS.start && hour < QUIET_HOURS.end;
}
