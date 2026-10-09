import { istDayNumber } from '../time';
import { userRef } from '../users';
import { tidyCourse } from './manipal-ics';
import { findQuiz, htmlToText } from './quiz-posts';
import type { RawTask, SourceAdapter } from './types';

/**
 * Quizzes that teachers only announce in a course post (the Activity Feed or Announcements on the
 * course home), never in the Quizzes tool, so they aren't in the calendar feed. The Lume Chrome
 * extension reads the posts with the student's LMS session and sends them to /api/ingest/lms. Only
 * the quizzes found in them are kept, in `users/{uid}/meta/lms-posts`; the posts are never stored.
 * They join the calendar feed's tasks, so they get the same reminders and alarms.
 */

export type LmsCourse = { id: string; name: string; ok: boolean; error?: string };

export type LmsPost = {
  /** `feed:<uuid>` for an Activity Feed post, `news:<id>` for an announcement. */
  id: string;
  courseId: string;
  title: string;
  html: string;
  publishedAt: string;
  updatedAt?: string;
};

export type LmsPayload = { version: string; error?: string; courses: LmsCourse[]; posts: LmsPost[] };

/** A quiz found in a post, as stored. */
export type PostQuiz = { externalId: string; course: string; title: string; dueAt: number; url: string; postedAt: number };

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

/** Checks what the extension sent; anything malformed is dropped, not trusted. */
export function parseLmsPayload(body: unknown): LmsPayload | null {
  const x = body as Record<string, unknown>;
  if (typeof x !== 'object' || x === null || !Array.isArray(x.courses) || !Array.isArray(x.posts)) return null;
  return {
    version: typeof x.version === 'string' ? x.version.slice(0, 20) : '?',
    error: typeof x.error === 'string' && x.error ? x.error.slice(0, 300) : undefined,
    courses: x.courses.filter(isCourse).slice(0, 40).map((c) => ({ ...c, error: typeof c.error === 'string' ? c.error.slice(0, 200) : undefined })),
    posts: x.posts.filter(isPost).slice(0, 600),
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
      dueAt: quiz.at.getTime(),
      url: kind === 'news' ? `${lmsOrigin}/d2l/le/news/${post.courseId}/${id}/view` : `${lmsOrigin}/d2l/home/${post.courseId}`,
      postedAt,
    });
  }
  return out;
}

type Stored = { courses: Record<string, { name: string; quizzes: PostQuiz[] }> };
const storeDoc = (uid: string) => userRef(uid).collection('meta').doc('lms-posts');

/**
 * Saves the quizzes in a run's posts. A course that couldn't be read keeps what it had; courses the
 * extension no longer reads (last semester's) are dropped.
 */
export async function savePostQuizzes(uid: string, payload: LmsPayload, lmsOrigin: string, now = Date.now()): Promise<PostQuiz[]> {
  const previous = ((await storeDoc(uid).get()).data() as Stored | undefined)?.courses ?? {};
  const courses: Stored['courses'] = {};
  for (const c of payload.courses) {
    const posts = payload.posts.filter((p) => p.courseId === c.id);
    // Quizzes long past are of no use; keeping a month of them stops an old one coming back as new.
    courses[c.id] = c.ok
      ? { name: c.name, quizzes: quizzesInPosts(posts, c.name, lmsOrigin).filter((q) => q.dueAt > now - 30 * 86_400_000) }
      : (previous[c.id] ?? { name: c.name, quizzes: [] });
  }
  await storeDoc(uid).set({ courses });
  return Object.values(courses).flatMap((c) => c.quizzes);
}

async function storedPostQuizzes(uid: string): Promise<PostQuiz[]> {
  const doc = await storeDoc(uid).get();
  return Object.values((doc.data() as Stored | undefined)?.courses ?? {}).flatMap((c) => c.quizzes);
}

const sameCourse = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, ' ').trim() === b.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * The calendar's tasks plus the posted quizzes. A posted quiz that's also in the calendar (the
 * teacher made it in the Quizzes tool too) is left to the calendar.
 */
export function mergePostQuizzes(calendar: RawTask[], quizzes: PostQuiz[]): RawTask[] {
  const inCalendar = (q: PostQuiz) =>
    calendar.some(
      (t) => t.type === 'quiz' && sameCourse(t.course, q.course) && [t.dueAt, t.opensAt].some((d) => d && istDayNumber(d) === istDayNumber(q.dueAt)),
    );
  const posted = quizzes
    .filter((q) => !inCalendar(q))
    .map((q): RawTask => ({
      source: 'manipal',
      externalId: q.externalId,
      course: q.course,
      title: q.title,
      type: 'quiz',
      dueAt: new Date(q.dueAt),
      opensAt: null,
      url: q.url,
    }));
  return [...calendar, ...posted];
}

/** A student's LMS as one source: their calendar feed plus the quizzes announced in their course posts. */
export function withPostQuizzes(uid: string, calendar: SourceAdapter): SourceAdapter {
  return {
    source: calendar.source,
    authoritative: calendar.authoritative,
    async fetchTasks(): Promise<RawTask[]> {
      const [tasks, quizzes] = await Promise.all([calendar.fetchTasks(), storedPostQuizzes(uid)]);
      return mergePostQuizzes(tasks, quizzes);
    },
  };
}
