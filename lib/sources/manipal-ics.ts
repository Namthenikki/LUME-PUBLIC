import ical, { type DateWithTimeZone, type ParameterValue, type VEvent } from 'node-ical';
import { IST_OFFSET } from '../time';
import type { RawTask, SourceAdapter, TaskType } from './types';

/**
 * Reads the MUJ Brightspace (D2L) calendar feed.
 *
 * Brightspace emits several events per item: a quiz can have "– Available", "– Availability Ends"
 * and "– Due" events, each with its own UID. They all link to the same quiz or dropbox in the
 * DESCRIPTION, so events are grouped by that link and each group becomes one task.
 */
export class ManipalIcsAdapter implements SourceAdapter {
  readonly source = 'manipal';
  readonly authoritative = true;

  constructor(private readonly feedUrl: string) {}

  async fetchTasks(): Promise<RawTask[]> {
    // Errors never include the URL: it contains the personal feed token.
    let res: Response;
    try {
      res = await fetch(this.feedUrl, { cache: 'no-store' });
    } catch (err) {
      const cause = (err as { cause?: { code?: string } }).cause;
      throw new Error(`Could not reach the MUJ feed (${cause?.code ?? 'network error'})`);
    }
    if (!res.ok) throw new Error(`MUJ feed returned HTTP ${res.status}`);
    const body = await res.text();
    if (!body.includes('BEGIN:VCALENDAR')) throw new Error('MUJ feed did not return iCal data (token expired?)');
    return parseManipalFeed(body);
  }
}

// Brightspace uses "-" before "Due" on assignments and "–" on quizzes.
const SUFFIX = /\s[-–]\s(Due|Available|Availability Ends)$/;
const ITEM_LINK = /https?:\/\/\S+\/(quizzing\/quizzing|dropbox\/user\/folder_submit_files)\.d2l\?\S+/;
const EVENT_LINK = /View event\s*[-–]\s*(https?:\/\/\S+)/;

type Part = { kind: 'Due' | 'Available' | 'Availability Ends' | null; at: Date; ev: VEvent };

export function parseManipalFeed(body: string): RawTask[] {
  const groups = new Map<string, Part[]>();
  for (const c of Object.values(ical.sync.parseICS(body))) {
    if (c?.type !== 'VEVENT') continue;
    const key = itemKey(text(c.description)) ?? `uid:${c.uid}`;
    const kind = (SUFFIX.exec(text(c.summary))?.[1] ?? null) as Part['kind'];
    groups.set(key, [...(groups.get(key) ?? []), { kind, at: toInstant(c.start), ev: c }]);
  }

  const tasks: RawTask[] = [];
  for (const [externalId, parts] of groups) {
    const find = (kind: Part['kind']) => parts.find((p) => p.kind === kind);
    // The deadline is "Due", else "Availability Ends"; an item that only has an opening time has no deadline.
    const deadline = find('Due') ?? find('Availability Ends') ?? find(null);
    if (!deadline) continue;
    const description = text(deadline.ev.description);
    tasks.push({
      source: 'manipal',
      externalId,
      course: tidyCourse(text(deadline.ev.location)) || 'Unknown course',
      title: text(deadline.ev.summary).replace(SUFFIX, '').trim(),
      type: taskType(description),
      dueAt: deadline.at,
      opensAt: find('Available')?.at ?? null,
      url: ITEM_LINK.exec(description)?.[0] ?? EVENT_LINK.exec(description)?.[1] ?? null,
    });
  }
  return tasks;
}

/** `quiz:<course>:<quiz>` or `dropbox:<course>:<folder>` from the item link, if the event has one. */
function itemKey(description: string): string | null {
  const link = ITEM_LINK.exec(description);
  if (!link) return null;
  const params = new URL(link[0]).searchParams;
  const quiz = params.get('qi');
  const folder = params.get('db');
  return quiz ? `quiz:${params.get('ou')}:${quiz}` : folder ? `dropbox:${params.get('ou')}:${folder}` : null;
}

const SMALL_WORDS = new Set(['and', 'of', 'the', 'for', 'in', 'on', 'to', 'a', 'an', 'with']);

/** The LMS names courses in capitals ("DATA STRUCTURES AND ALGORITHMS"); show them in title case. */
function tidyCourse(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Brightspace lists the item under a "Quizzes:" or "Assignments:" heading in the description. */
function taskType(description: string): TaskType {
  if (/^Quizzes:\s*$/m.test(description)) return 'quiz';
  if (/^Assignments:\s*$/m.test(description)) return 'assignment';
  return 'other';
}

/**
 * node-ical builds zoneless times (floating, or date-only) in the server's local zone, which is
 * UTC on Vercel. Re-read their wall-clock value as IST; a date-only deadline means 23:59 IST.
 */
function toInstant(d: DateWithTimeZone): Date {
  if (d.tz && !d.dateOnly) return d;
  const [h, m, s] = d.dateOnly ? [23, 59, 0] : [d.getHours(), d.getMinutes(), d.getSeconds()];
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h, m, s) - IST_OFFSET);
}

const text = (v: ParameterValue | undefined): string => (typeof v === 'string' ? v : (v?.val ?? '')).trim();
