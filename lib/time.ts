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
