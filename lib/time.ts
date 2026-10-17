export const HOUR = 3_600_000;
export const IST_OFFSET = 5.5 * HOUR;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "11:59 PM" in IST, independent of the server's timezone. */
export function timeIST(date: Date | number): string {
  const d = new Date(new Date(date).getTime() + IST_OFFSET);
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Wed 30 Sep" in IST. */
export function dayIST(date: Date | number): string {
  const d = new Date(new Date(date).getTime() + IST_OFFSET);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Wed 30 Sep, 11:59 PM" in IST. */
export function formatIST(date: Date | number): string {
  return `${dayIST(date)}, ${timeIST(date)}`;
}

/** Days since the epoch in IST: equal numbers mean the same IST calendar day. */
export function istDayNumber(date: Date | number): number {
  return Math.floor((new Date(date).getTime() + IST_OFFSET) / (24 * HOUR));
}

/** "2026-09-30": the IST calendar date, for document ids. */
export function istDateKey(date: Date | number): string {
  return new Date(new Date(date).getTime() + IST_OFFSET).toISOString().slice(0, 10);
}

/** "8:00–8:30 PM" in IST, or "11:30 AM–12:30 PM": a quiz window, short enough for a task row. */
export function rangeIST(opensAt: Date | number, closesAt: Date | number): string {
  const [from, to] = [timeIST(opensAt), timeIST(closesAt)];
  return from.slice(-2) === to.slice(-2) ? `${from.slice(0, -3)}–${to}` : `${from}–${to}`;
}

/** "Sat 17 Oct, 8:00 PM to 8:30 PM" in IST: a quiz window. */
export function windowIST(opensAt: Date | number, closesAt: Date | number): string {
  return `${formatIST(opensAt)} to ${istDayNumber(opensAt) === istDayNumber(closesAt) ? timeIST(closesAt) : formatIST(closesAt)}`;
}
