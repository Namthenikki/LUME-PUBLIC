import { istDayNumber } from '../time';
import { userRef } from '../users';
import { tidyCourse } from './manipal-ics';
import { findQuiz, htmlToText } from './quiz-posts';
import type { RawTask, SourceAdapter } from './types';

/**
 * What the calendar feed doesn't say about LMS quizzes, read by the Lume Chrome extension with the
 * student's LMS session and sent to /api/ingest/lms:
 * - Quizzes that teachers only announce in a course post (the Activity Feed or Announcements on the
 *   course home), never in the Quizzes tool, so they aren't in the calendar feed. Only the quizzes
 *   found in the posts are kept; the posts themselves are never stored.
 * - The Quizzes tool's own list: when each quiz opens (the calendar often only has its end) and
 *   whether the student has attempted it, which ticks it done.
 * Both are kept in `users/{uid}/meta/lms-posts` and join the calendar feed's tasks, so they get the
 * same reminders and alarms.
 */

/** `quizzesError`: its posts were read but its quizzes weren't. */
export type LmsCourse = { id: string; name: string; ok: boolean; error?: string; quizzesError?: string };

/** A quiz in a course's Quizzes tool, as the extension reads it (times are the LMS's ISO strings). */
export type LmsQuiz = {
  courseId: string;
  id: string;
  name: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  dueAt: string | null;
  /** Attempts you've made ("1 / 1" on the Quizzes page), or null if the page didn't say. */
  attempts: number | null;
  /** On your Quizzes page, which only lists quizzes you can see; null if the page couldn't be read. */
  listed?: boolean | null;
};

/** A Quizzes tool quiz, as stored. `dueAt`: its due date, else when it closes; null if it has neither. */
export type ToolQuiz = {
  courseId: string;
  id: string;
  course: string;
  name: string;
  active: boolean;
  startsAt: number | null;
  dueAt: number | null;
  attempts: number | null;
  listed: boolean | null;
  url: string;
};

export type LmsPost = {
  /** `feed:<uuid>` for an Activity Feed post, `news:<id>` for an announcement. */
  id: string;
  courseId: string;
  title: string;
  html: string;
  publishedAt: string;
  updatedAt?: string;
};

/** `quizzes` is null from extensions older than 1.3.0, which don't read the Quizzes tool. */
export type LmsPayload = { version: string; error?: string; courses: LmsCourse[]; posts: LmsPost[]; quizzes: LmsQuiz[] | null };

/**
 * A quiz found in a post, as stored. `startsAt`: the time the post gives (a range's start), if it gives
 * one. `dueAt`: the range's end ("8PM-8:30PM"), else that time, else the end of the day.
 */
export type PostQuiz = { externalId: string; course: string; title: string; startsAt?: number | null; dueAt: number; url: string; postedAt: number };

const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
const date = (v: unknown) => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));

function isCourse(c: unknown): c is LmsCourse {
  const x = c as Record<string, unknown>;
  return typeof x === 'object' && x !== null && str(x.id, 12) && /^\d+$/.test(x.id as string) && str(x.name, 300) && typeof x.ok === 'boolean';
}

function isPost(p: unknown): p is LmsPost {
  const x = p as Record<string, unknown>;
  return (
    typeof x === 'object' &&
    x !== null &&
    str(x.id, 80) &&
    /^(feed|news):[\w-]+$/.test(x.id as string) &&
    str(x.courseId, 12) &&
    /^\d+$/.test(x.courseId as string) &&
    typeof x.title === 'string' &&
    x.title.length <= 300 &&
    typeof x.html === 'string' &&
    x.html.length <= 50_000 &&
    date(x.publishedAt) &&
    (x.updatedAt === undefined || x.updatedAt === null || date(x.updatedAt))
  );
}

const dateOrNull = (v: unknown) => v === null || date(v);

function isQuiz(q: unknown): q is LmsQuiz {
  const x = q as Record<string, unknown>;
  return (
    typeof x === 'object' &&
    x !== null &&
    str(x.courseId, 12) &&
    /^\d+$/.test(x.courseId as string) &&
    str(x.id, 12) &&
    /^\d+$/.test(x.id as string) &&
    typeof x.name === 'string' &&
    x.name.length <= 300 &&
    typeof x.active === 'boolean' &&
    dateOrNull(x.startsAt) &&
    dateOrNull(x.endsAt) &&
    dateOrNull(x.dueAt) &&
    (x.attempts === null || (Number.isSafeInteger(x.attempts) && (x.attempts as number) >= 0)) &&
    (x.listed === undefined || x.listed === null || typeof x.listed === 'boolean')
  );
}

/** Checks what the extension sent; anything malformed is dropped, not trusted. */
export function parseLmsPayload(body: unknown): LmsPayload | null {
  const x = body as Record<string, unknown>;
  if (typeof x !== 'object' || x === null || !Array.isArray(x.courses) || !Array.isArray(x.posts)) return null;
  return {
    version: typeof x.version === 'string' ? x.version.slice(0, 20) : '?',
    error: typeof x.error === 'string' && x.error ? x.error.slice(0, 300) : undefined,
    courses: x.courses
      .filter(isCourse)
      .slice(0, 40)
      .map((c) => ({
        id: c.id,
        name: c.name,
        ok: c.ok,
        error: typeof c.error === 'string' ? c.error.slice(0, 200) : undefined,
        quizzesError: typeof c.quizzesError === 'string' && c.quizzesError ? c.quizzesError.slice(0, 200) : undefined,
      })),
    posts: x.posts.filter(isPost).slice(0, 600),
    quizzes: Array.isArray(x.quizzes) ? x.quizzes.filter(isQuiz).slice(0, 600) : null,
  };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * The quizzes announced in a course's posts. A numbered quiz ("Quiz 2") is one task however many
 * posts mention it, and the newest post sets its date, so a "date changed" post moves it. Two
 * posts about the same day's quiz are one task too.
 */
export function quizzesInPosts(posts: LmsPost[], courseName: string, lmsOrigin: string): PostQuiz[] {
  const found = posts
    .map((p) => {
      const postedAt = Math.max(Date.parse(p.publishedAt), p.updatedAt ? Date.parse(p.updatedAt) : 0);
      const quiz = findQuiz({ title: p.title, text: htmlToText(p.html), publishedAt: new Date(p.publishedAt) });
      return quiz && { post: p, quiz, postedAt };
    })
    .filter((f) => f !== null)
    .sort((a, b) => b.postedAt - a.postedAt);

  const course = tidyCourse(courseName.replace(/\s+/g, ' ').trim());
  const keys = new Set<string>();
  const days = new Set<number>();
  const out: PostQuiz[] = [];
  for (const { post, quiz, postedAt } of found) {
    const key = quiz.number ? slug(quiz.title) : post.id;
    const day = istDayNumber(quiz.at);
    if (keys.has(key) || days.has(day)) continue;
    keys.add(key);
    days.add(day);
    const [kind, id] = post.id.split(':');
    out.push({
      externalId: `post:${post.courseId}:${key}`,
      course,
      title: quiz.title,
      startsAt: quiz.hasTime ? quiz.at.getTime() : null,
      dueAt: (quiz.endsAt ?? quiz.at).getTime(),
      url: kind === 'news' ? `${lmsOrigin}/d2l/le/news/${post.courseId}/${id}/view` : `${lmsOrigin}/d2l/home/${post.courseId}`,
      postedAt,
    });
  }
  return out;
}

type Stored = { courses: Record<string, { name: string; quizzes: PostQuiz[]; tool?: ToolQuiz[] }> };
const storeDoc = (uid: string) => userRef(uid).collection('meta').doc('lms-posts');

const time = (iso: string | null) => (iso === null ? null : Date.parse(iso));

/** A course's quizzes in the Quizzes tool, as stored. */
function toolQuizzes(quizzes: LmsQuiz[], courseName: string, lmsOrigin: string): ToolQuiz[] {
  return quizzes.map((q) => ({
    courseId: q.courseId,
    id: q.id,
    course: tidyCourse(courseName.replace(/\s+/g, ' ').trim()),
    name: q.name || `Quiz ${q.id}`,
    active: q.active,
    startsAt: time(q.startsAt),
    dueAt: time(q.dueAt) ?? time(q.endsAt),
    attempts: q.attempts,
    listed: q.listed ?? null,
    url: `${lmsOrigin}/d2l/lms/quizzing/quizzing.d2l?ou=${q.courseId}&qi=${q.id}`,
  }));
}

export type StoredLmsQuizzes = { posted: PostQuiz[]; tool: ToolQuiz[] };

const stored = (s: Stored | undefined): StoredLmsQuizzes => {
  const courses = Object.values(s?.courses ?? {});
  return { posted: courses.flatMap((c) => c.quizzes), tool: courses.flatMap((c) => c.tool ?? []) };
};

/**
 * Saves the quizzes in a run's posts and Quizzes tools. A course that couldn't be read keeps what it
 * had, and so does its Quizzes tool when that alone failed or an older extension doesn't read it;
 * courses the extension no longer reads (last semester's) are dropped.
 */
export async function saveLmsQuizzes(uid: string, payload: LmsPayload, lmsOrigin: string, now = Date.now()): Promise<StoredLmsQuizzes> {
  const previous = ((await storeDoc(uid).get()).data() as Stored | undefined)?.courses ?? {};
  const courses: Stored['courses'] = {};
  for (const c of payload.courses) {
    const before = previous[c.id];
    if (!c.ok) {
      courses[c.id] = before ?? { name: c.name, quizzes: [] };
      continue;
    }
    const posts = payload.posts.filter((p) => p.courseId === c.id);
    courses[c.id] = {
      name: c.name,
      // Quizzes long past are of no use; keeping a month of them stops an old one coming back as new.
      quizzes: quizzesInPosts(posts, c.name, lmsOrigin).filter((q) => q.dueAt > now - 30 * 86_400_000),
      tool:
        payload.quizzes && !c.quizzesError ? toolQuizzes(payload.quizzes.filter((q) => q.courseId === c.id), c.name, lmsOrigin) : (before?.tool ?? []),
    };
  }
  await storeDoc(uid).set({ courses });
  return stored({ courses });
}

async function storedLmsQuizzes(uid: string): Promise<StoredLmsQuizzes> {
  return stored((await storeDoc(uid).get()).data() as Stored | undefined);
}

const sameCourse = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, ' ').trim() === b.toLowerCase().replace(/\s+/g, ' ').trim();

/** The longest quiz window a post's start time can open (matches lib/stages.ts). */
const SITTING_MAX = 6 * 3_600_000;

const toolKey = (q: ToolQuiz) => `quiz:${q.courseId}:${q.id}`;
const attempted = (q: ToolQuiz | undefined) => (q?.attempts ?? 0) > 0;

/**
 * The calendar's tasks, with what the extension read from the LMS:
 * - A quiz's start from the Quizzes tool, when the calendar only says when it closes ("Quiz 2, Due
 *   8:30 PM"); failing that, from a post's "8PM-8:30PM" on the same day.
 * - Done, once you've attempted it (its Quizzes page reads "1 / 1").
 * - Quizzes tool quizzes the calendar doesn't show at all (no due date, dates hidden from it), if
 *   they're on your Quizzes page: the tool also lists quizzes meant for other sections.
 * - Quizzes only announced in posts. One that's also a quiz above (same course, same day) is left to it.
 */
export function mergeLmsQuizzes(calendar: RawTask[], posted: PostQuiz[], tool: ToolQuiz[] = []): RawTask[] {
  const fromTool = new Map(tool.map((q) => [toolKey(q), q]));
  const inCalendar = new Set(calendar.map((t) => t.externalId));
  const hidden = tool
    .filter((q) => q.active && q.listed === true && q.dueAt !== null && !inCalendar.has(toolKey(q)))
    .map((q): RawTask => ({ source: 'manipal', externalId: toolKey(q), course: q.course, title: q.name, type: 'quiz', dueAt: new Date(q.dueAt!), opensAt: null, url: q.url }));
  const quizzes = [...calendar, ...hidden];

  const sameDay = (t: RawTask, p: PostQuiz) =>
    t.type === 'quiz' && sameCourse(t.course, p.course) && [t.dueAt, t.opensAt].some((d) => d && istDayNumber(d) === istDayNumber(p.dueAt));
  const opensBefore = (t: RawTask, start: number | null | undefined, max = Infinity): start is number =>
    !!start && start < t.dueAt.getTime() && t.dueAt.getTime() - start <= max;

  const tasks = quizzes.map((t): RawTask => {
    if (t.type !== 'quiz') return t;
    const q = fromTool.get(t.externalId);
    const postStart = posted.find((p) => sameDay(t, p) && opensBefore(t, p.startsAt, SITTING_MAX))?.startsAt;
    const opensAt = t.opensAt ?? (opensBefore(t, q?.startsAt) ? new Date(q!.startsAt!) : postStart ? new Date(postStart) : null);
    return { ...t, opensAt, ...(attempted(q) || t.submitted ? { submitted: true } : {}) };
  });

  const announced = posted
    .filter((p) => !quizzes.some((t) => sameDay(t, p)))
    .map((p): RawTask => ({
      source: 'manipal',
      externalId: p.externalId,
      course: p.course,
      title: p.title,
      type: 'quiz',
      dueAt: new Date(p.dueAt),
      // A post with a window ("8PM-8:30PM") opens at its start; one with a single time is due then.
      opensAt: p.startsAt && p.startsAt < p.dueAt ? new Date(p.startsAt) : null,
      url: p.url,
    }));
  return [...tasks, ...announced];
}

/** Upcoming LMS quizzes, for the extension's popup: the Quizzes tool's, and those only announced in posts. */
export function upcomingLmsQuizzes({ posted, tool }: StoredLmsQuizzes, now: number) {
  const fromTool = tool
    .filter((q) => q.active && q.listed === true && q.dueAt !== null && q.dueAt > now)
    .map((q) => ({ course: q.course, title: q.name, startsAt: q.startsAt, dueAt: q.dueAt!, url: q.url, done: attempted(q) }));
  const fromPosts = posted
    .filter((p) => p.dueAt > now && !fromTool.some((q) => sameCourse(q.course, p.course) && istDayNumber(q.dueAt) === istDayNumber(p.dueAt)))
    .map((p) => ({ course: p.course, title: p.title, startsAt: p.startsAt ?? null, dueAt: p.dueAt, url: p.url, done: false }));
  return [...fromTool, ...fromPosts].sort((a, b) => (a.startsAt ?? a.dueAt) - (b.startsAt ?? b.dueAt));
}

/** A student's LMS as one source: their calendar feed plus what their extension read (course posts and the Quizzes tool). */
export function withLmsQuizzes(uid: string, calendar: SourceAdapter): SourceAdapter {
  return {
    source: calendar.source,
    authoritative: calendar.authoritative,
    async fetchTasks(): Promise<RawTask[]> {
      const [tasks, lms] = await Promise.all([calendar.fetchTasks(), storedLmsQuizzes(uid)]);
      return mergeLmsQuizzes(tasks, lms.posted, lms.tool);
    },
  };
}
