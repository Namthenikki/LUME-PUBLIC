import type { RawTask, SourceAdapter } from './types';

/**
 * NPTEL deadlines, pushed by the Lume Chrome extension (extension/). The extension runs in the
 * student's logged-in Chrome, reads NPTEL's own JSON API for each course, and posts what it found
 * to /api/ingest/nptel. There is no NPTEL login on the server: nothing here can expire.
 */

export type NptelCourse = { id: string; name: string; ok: boolean; error?: string };

export type NptelItem = {
  courseId: string;
  course: string;
  /** `<unit id>:<assessment id>`, stable for an assignment across runs. */
  id: string;
  title: string;
  dueAt: string;
  url: string;
  submitted: boolean;
};

export type NptelPayload = {
  version: string;
  /** Set when the whole run failed, e.g. signed out of NPTEL. */
  error?: string;
  courses: NptelCourse[];
  items: NptelItem[];
};

const COURSE_ID = /^noc\d{2}_[a-z]{2,4}\d{1,4}$/;
const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

function isCourse(c: unknown): c is NptelCourse {
  const x = c as Record<string, unknown>;
  return typeof x === 'object' && x !== null && str(x.id, 40) && COURSE_ID.test(x.id as string) && typeof x.name === 'string' && typeof x.ok === 'boolean';
}

function isItem(i: unknown): i is NptelItem {
  const x = i as Record<string, unknown>;
  return (
    typeof x === 'object' &&
    x !== null &&
    str(x.courseId, 40) &&
    COURSE_ID.test(x.courseId as string) &&
    str(x.course, 300) &&
    str(x.id, 60) &&
    str(x.title, 300) &&
    str(x.dueAt, 40) &&
    !Number.isNaN(Date.parse(x.dueAt as string)) &&
    str(x.url, 500) &&
    (x.url as string).startsWith('https://onlinecourses.nptel.ac.in/') &&
    typeof x.submitted === 'boolean'
  );
}

/** Checks what the extension sent; anything malformed is dropped, not trusted. */
export function parseNptelPayload(body: unknown): NptelPayload | null {
  const x = body as Record<string, unknown>;
  if (typeof x !== 'object' || x === null || !Array.isArray(x.courses) || !Array.isArray(x.items)) return null;
  return {
    version: typeof x.version === 'string' ? x.version.slice(0, 20) : '?',
    error: typeof x.error === 'string' && x.error ? x.error.slice(0, 300) : undefined,
    courses: x.courses.filter(isCourse).slice(0, 20),
    items: x.items.filter(isItem).slice(0, 500),
  };
}

export class NptelAdapter implements SourceAdapter {
  readonly source = 'nptel';
  /** A full list only when every course was read; one failing course must not cancel its tasks. */
  readonly authoritative: boolean;

  constructor(private readonly payload: NptelPayload) {
    this.authoritative = payload.courses.length > 0 && payload.courses.every((c) => c.ok);
  }

  async fetchTasks(): Promise<RawTask[]> {
    return this.payload.items.map((i) => ({
      source: 'nptel',
      externalId: `${i.courseId}/${i.id}`,
      course: i.course.trim(),
      title: i.title.trim(),
      type: 'assignment',
      dueAt: new Date(i.dueAt),
      opensAt: null,
      url: i.url,
      submitted: i.submitted,
    }));
  }
}
