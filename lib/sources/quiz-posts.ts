import { HOUR, IST_OFFSET, istDayNumber } from '../time';

/**
 * Finds a quiz announcement in a course post (the LMS Activity Feed or Announcements), e.g.
 * "QUIZ 2: Statistics and Probability / Date: 13/10/2026 (Tuesday) / Time: 8PM-8:30PM".
 *
 * Only quizzes count. Course notes, PYQs, marks lists and the like are ignored: a post has to
 * mention a quiz (not its marks, result or solutions) and give a date for it.
 */

export type QuizPost = { title: string; text: string; publishedAt: Date };
export type FoundQuiz = { title: string; number: number | null; at: Date; hasTime: boolean };

/** Plain text from a post's HTML, one line per paragraph. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|hr)\b[^>]*>|<\/(p|div|li|tr|h\d|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&\w+;/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

// "quiz", "re-quiz", "class test", "viva". A plain "test" only counts with a number ("Test 2"):
// statistics posts talk about t-tests and hypothesis tests.
const QUIZ =
  /\b(?:(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s+)?(re[-\s]?quiz|quiz|(?:class|surprise|lab|online|mock|unit|weekly)[-\s]?test|viva(?:[-\s]voce)?|test(?=\s*[-#:]?\s*(?:no\.?\s*)?\d))\b(?:\s*[-#:]?\s*(?:no\.?\s*)?(\d{1,2}|I{1,3}|IV|V)\b(?![/.:-]\d))?/gi;
// A mention that's about the quiz's marks, result or solutions, not the quiz itself.
const RESULT_AFTER = /^\W{0,3}(marks?|results?|scores?|solutions?|answers?|answer\s*keys?|grades?|review|re-?evaluation|discrepanc)/i;
const RESULT_BEFORE = /(marks?|results?|scores?|solutions?|answer\s*keys?|answer\s*sheets?|grades?)\s+(of|for|in)\s+(the\s+)?$/i;

const ORDINAL: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5 };
const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const monthOf = (name: string) => ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(name.slice(0, 3).toLowerCase());

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// 13/10/2026, 01-09-2026, 16 September 2026, 16th Sept, Sep 01, 2026, 13/10, today, on Tuesday.
const DATE = new RegExp(
  [
    String.raw`\b(?<nd>\d{1,2})[/.-](?<nm>\d{1,2})[/.-](?<ny>\d{4}|\d{2})\b`,
    String.raw`\b(?<td>\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?[\s-]*(?<tm>${MONTHS})\b\.?(?:[\s,-]+(?<ty>\d{4})\b)?`,
    String.raw`\b(?<um>${MONTHS})\b\.?\s+(?<ud>\d{1,2})(?:st|nd|rd|th)?\b(?![/.:-]\d)(?:,?\s+(?<uy>\d{4})\b)?`,
    String.raw`\b(?<sd>\d{1,2})/(?<sm>\d{1,2})\b(?![/.-]\d)`,
    String.raw`\b(?<rel>today|tonight|tomorrow)\b`,
    String.raw`\b(?:on|this|next|coming)\s+(?<wd>mon|tue|wed|thu|fri|sat|sun)[a-z]*\b`,
  ].join('|'),
  'gi',
);

// 8PM-8:30PM, 8:00-8:30 PM, 8:00 PM to 8:30 PM, 2:30 - 3:00 pm, 7:30pm, 8 PM, 20:00 hrs.
const MERIDIEM = String.raw`(a\.?m\.?|p\.?m\.?)(?![a-z])`;
const TIME = new RegExp(
  [
    String.raw`\b(?<rh>\d{1,2})(?:[:.](?<rmin>\d{2}))?\s*(?<rap>${MERIDIEM})?\s*(?:-|–|—|to)\s*\d{1,2}(?:[:.]\d{2})?\s*(?<rap2>${MERIDIEM})`,
    String.raw`\b(?<h>\d{1,2})(?:[:.](?<min>\d{2}))?\s*(?<ap>${MERIDIEM})`,
    String.raw`\b(?<hh>[01]?\d|2[0-3])[:.](?<hmin>[0-5]\d)\s*(?:hrs?|hours)\b`,
    String.raw`\b(?<h24>1[3-9]|2[0-3]):(?<m24>[0-5]\d)\b`,
  ].join('|'),
  'gi',
);

const CHANGED = /postpone|reschedul|changed|shifted|prepone|moved|instead of/i;

type Hit = { index: number; day: number; tier: number };

/**
 * The dates in the text, as IST day numbers. Dates without a year take the one nearest the post.
 * Only the clearest kind present counts: with "13/10/2026" in a post, a "1/4" (negative marking)
 * or a "today" elsewhere in it is not the quiz date.
 */
function findDates(text: string, publishedAt: Date): Hit[] {
  const posted = istDayNumber(publishedAt);
  const postedYear = new Date(publishedAt.getTime() + IST_OFFSET).getUTCFullYear();
  const hits: Hit[] = [];
  for (const m of text.matchAll(DATE)) {
    const g = m.groups!;
    let day: number | null;
    let tier = 0;
    if (g.wd) {
      // "on Tuesday": the next Tuesday after the post.
      const weekday = (posted + 4) % 7; // day 0 (1 Jan 1970) was a Thursday
      day = posted + ((WEEKDAYS.indexOf(g.wd.toLowerCase()) - weekday + 6) % 7) + 1;
      tier = 3;
    } else if (g.rel) {
      day = posted + (g.rel.toLowerCase() === 'tomorrow' ? 1 : 0);
      tier = 2;
    } else {
      const d = Number(g.nd ?? g.td ?? g.ud ?? g.sd);
      const mo = (g.nm ?? g.sm) ? Number(g.nm ?? g.sm) - 1 : monthOf(g.tm ?? g.um);
      const y = g.ny ?? g.ty ?? g.uy;
      day = y ? dayNumber(Number(y.length === 2 ? `20${y}` : y), mo, d) : nearestYear(postedYear, mo, d, posted);
      tier = g.sd ? 1 : 0;
    }
    // A quiz is announced shortly before it happens: anything far from the post date is something else.
    if (day !== null && day >= posted - 3 && day <= posted + (tier === 1 ? 60 : 200)) hits.push({ index: m.index, day, tier });
  }
  const best = Math.min(...hits.map((h) => h.tier));
  return hits.filter((h) => h.tier === best);
}

function dayNumber(y: number, m: number, d: number): number | null {
  const t = Date.UTC(y, m, d);
  const back = new Date(t);
  if (m < 0 || back.getUTCMonth() !== m || back.getUTCDate() !== d) return null;
  return t / (24 * HOUR);
}

function nearestYear(year: number, m: number, d: number, posted: number): number | null {
  const day = dayNumber(year, m, d);
  return day !== null && day < posted - 60 ? dayNumber(year + 1, m, d) : day;
}

/** Every time of day in the text, in minutes after midnight. A range gives its start. */
function findTimes(text: string): { index: number; minutes: number }[] {
  const out: { index: number; minutes: number }[] = [];
  for (const m of text.matchAll(TIME)) {
    const g = m.groups!;
    let h = Number(g.rh ?? g.h ?? g.hh ?? g.h24);
    const min = Number(g.rmin ?? g.min ?? g.hmin ?? g.m24 ?? 0);
    const ap = (g.rap ?? g.rap2 ?? g.ap)?.toLowerCase();
    if (ap) {
      if (h < 1 || h > 12) continue;
      h = (h % 12) + (ap.startsWith('p') ? 12 : 0);
    }
    if (h > 23 || min > 59) continue;
    out.push({ index: m.index, minutes: h * 60 + min });
  }
  return out;
}

/** The quiz a post announces, or null if it doesn't announce one with a date. */
export function findQuiz(post: QuizPost): FoundQuiz | null {
  const text = [post.title.trim(), post.text.trim()].filter(Boolean).join('\n');

  const mention = [...text.matchAll(QUIZ)].find((m) => {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 30);
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    return !RESULT_AFTER.test(after) && !RESULT_BEFORE.test(before);
  });
  if (!mention) return null;

  const dates = findDates(text, post.publishedAt);
  if (dates.length === 0) return null;
  // The first date after the quiz is named; when the post moves a date, the last one it gives.
  const distinct = new Set(dates.map((d) => d.day)).size;
  const date = CHANGED.test(text) && distinct > 1 ? dates.at(-1)! : (dates.find((d) => d.index > mention.index) ?? dates.at(-1)!);

  // The time written closest to that date; without one, the end of the day.
  const times = findTimes(text);
  const time = times.sort((a, b) => Math.abs(a.index - date.index) - Math.abs(b.index - date.index))[0];
  const minutes = time?.minutes ?? 23 * 60 + 59;
  const at = new Date(date.day * 24 * HOUR + minutes * 60_000 - IST_OFFSET);

  const [, ordinal, kind, num] = mention;
  const number = num ? (ROMAN[num.toUpperCase()] ?? Number(num)) : ordinal ? ORDINAL[ordinal.toLowerCase()] : null;
  return { title: label(kind) + (number ? ` ${number}` : ''), number: number ?? null, at, hasTime: !!time };
}

function label(kind: string): string {
  const k = kind.toLowerCase().replace(/[-\s]+/g, ' ');
  if (k.startsWith('re')) return 'Re-quiz';
  if (k.startsWith('viva')) return 'Viva';
  if (k === 'quiz') return 'Quiz';
  return k.charAt(0).toUpperCase() + k.slice(1);
}
