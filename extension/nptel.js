// Reads NPTEL deadlines from NPTEL's own JSON API: the same calls its course pages make, sent with
// the Chrome session you're already signed in with. Nothing here logs in or stores a password.

export const ORIGIN = 'https://onlinecourses.nptel.ac.in';
const API = `${ORIGIN}/e-learning/api`;
const PROGRAMMING = 'com.google.coursebuilder.programming_assignment';
const DAY = 86_400_000;

/** The signed-in NPTEL account isn't enrolled in this course (another student's course, added on a shared Chrome). */
export class NotEnrolled extends Error {}

export class SignedOut extends Error {
  constructor() {
    super('Signed out of NPTEL. Open onlinecourses.nptel.ac.in in Chrome on your laptop and log in');
  }
}

const COURSE_ID = /noc\d{2}_[a-z]{2,4}\d{1,4}/i;

/** A course id ("noc26_cs17") from a pasted id or any NPTEL link. */
export function courseIdFrom(text) {
  return COURSE_ID.exec(text ?? '')?.[0].toLowerCase() ?? null;
}

/** The course id of an NPTEL page that only enrolled students open (not the public preview). */
export function enrolledCourseFromUrl(url) {
  const m = /^https:\/\/onlinecourses\.nptel\.ac\.in\/(?:e-learning\/(?:course|progress)\/|(?=noc\d{2}_)(?!\S*\/preview))(noc\d{2}_[a-z]{2,4}\d{1,4})/i.exec(url ?? '');
  return m ? m[1].toLowerCase() : null;
}

/**
 * NPTEL's due dates, read the way its own pages read them. A wall-clock time with no zone is IST,
 * which is what NPTEL shows next to it.
 */
export function parseDue(value) {
  if (value === null || value === undefined || value === '') return null;
  let d;
  if (typeof value === 'number') d = new Date(value < 1e12 ? value * 1000 : value);
  else {
    const s = String(value).trim().replace(/\s*IST$/i, '');
    const naive = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?(?:\.\d+)?$/.exec(s);
    if (naive) d = new Date(`${naive[1]}T${naive[2]}${naive[3] ?? ':00'}+05:30`);
    else {
      d = new Date(s);
      if (Number.isNaN(d.getTime())) d = new Date(s.replace(',', ''));
    }
  }
  const year = d.getUTCFullYear();
  return Number.isNaN(d.getTime()) || year < 2020 || year > 2100 ? null : d;
}

/** Plain fetch from the extension: Chrome attaches your NPTEL cookies because of host_permissions. */
export async function fetchJson(url) {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  // A session that expired gets sent to the SWAYAM sign-in page instead of JSON.
  if (res.redirected && !res.url.startsWith(ORIGIN)) return { status: 401, json: null };
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json };
}

const unauthorized = (r) => r.status === 401 || r.status === 403 || r.json?.status === 401 || r.json?.status === 403;

/** A course's outline: its name and every assessment in it (without due dates). */
async function readOutline(courseId, get) {
  const r = await get(`${API}/courseoutline?course_id=${encodeURIComponent(courseId)}`);
  if (unauthorized(r)) throw new SignedOut();
  if (r.status !== 200 || !r.json) throw new Error(`NPTEL answered ${r.status}`);
  if (r.json.status !== undefined && r.json.status !== 200) throw new Error(r.json.message || `NPTEL answered ${r.json.status}`);

  let data;
  try {
    data = typeof r.json.payload === 'string' ? JSON.parse(r.json.payload) : (r.json.payload ?? r.json);
  } catch {
    throw new Error('NPTEL sent an outline Lume can’t read');
  }
  if (data?.custom_department_update_required) throw new Error('NPTEL wants you to finish your profile first');
  if (data?.is_enrolled === false) throw new NotEnrolled('You aren’t enrolled in this course');
  const list = Array.isArray(data?.assessments) ? data.assessments : Object.values(data?.assessments ?? {});
  return { name: String(data?.course_name ?? '').trim() || courseId, assessments: list.filter((a) => a && a.id != null && a.unit_id != null) };
}

/**
 * One assessment's due date. In the outline, `id` is the week's unit and `unit_id` is the
 * assessment itself; that's how NPTEL's own sidebar opens it.
 */
async function readAssessment(courseId, a, get) {
  const programming = a.custom_unit_type === PROGRAMMING;
  const params = new URLSearchParams({ course_id: courseId, unit_id: String(a.id) });
  params.set(programming ? 'programming_id' : 'assessment_id', String(a.unit_id));
  const r = await get(`${API}/${programming ? 'programming_assessment' : 'assessment'}?${params}`);
  if (unauthorized(r)) throw new SignedOut();
  if (r.status !== 200 || !r.json) throw new Error(`NPTEL answered ${r.status}`);
  const j = r.json;
  if (j.content === 'not visible') return { hidden: true };

  if (programming) {
    const assignment = j.data?.assignment ?? j.assignment ?? {};
    // Done when NPTEL shows its green tick next to it (state 2 in the outline), the same as quizzes.
    return { due: parseDue(assignment.submission_due_date ?? j.due_date), practice: !!(j.is_practice ?? assignment.is_practice), submitted: a.state === 2 };
  }
  return {
    due: parseDue(j.due_date),
    practice: !!j.is_practice,
    submitted: a.state === 2 || !!j.submission_date || j.submitted_contents_is_sumbitted === true,
  };
}

/** Runs `fn` over `list`, a few at a time, so NPTEL isn't flooded. */
async function pool(list, size, fn) {
  const out = new Array(list.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, list.length) }, async () => {
      while (next < list.length) {
        const i = next++;
        out[i] = await fn(list[i]);
      }
    }),
  );
  return out;
}

/**
 * Every assessment deadline in a course. `cache` remembers due dates, so assignments long past
 * and practice ones aren't fetched again every run.
 */
export async function readCourse(courseId, { get = fetchJson, cache = {}, now = Date.now() } = {}) {
  const { name, assessments } = await readOutline(courseId, get);
  const items = [];

  await pool(assessments, 4, async (a) => {
    const key = `${a.id}:${a.unit_id}`;
    const cacheKey = `${courseId}/${key}`;
    const known = cache[cacheKey];
    const settled = known && (known.practice || (known.due && known.due < now - 3 * DAY));
    // The outline is read fresh every run, so a green tick counts even for an assignment read from the cache.
    const info = settled ? { due: known.due ? new Date(known.due) : null, practice: known.practice, submitted: known.submitted || a.state === 2 } : await readAssessment(courseId, a, get);
    if (info.hidden) return; // not released yet
    cache[cacheKey] = { due: info.due?.getTime() ?? null, practice: info.practice, submitted: info.submitted };
    if (!info.due || info.practice) return;

    const programming = a.custom_unit_type === PROGRAMMING;
    items.push({
      courseId,
      course: name,
      id: key,
      title: String(a.title ?? '').trim() || 'Assignment',
      dueAt: info.due.toISOString(),
      url: `${ORIGIN}/e-learning/course/${courseId}?unitId=${a.id}&${programming ? 'progassignmentId' : 'assessmentId'}=${a.unit_id}`,
      submitted: info.submitted,
    });
  });

  items.sort((x, y) => x.dueAt.localeCompare(y.dueAt));
  return { name, items };
}

/**
 * Which NPTEL account is signed in: the email on a course's progress page. Null if NPTEL doesn't say,
 * in which case nothing is checked.
 */
async function signedInEmail(courseId, get) {
  try {
    const r = await get(`${API}/progress?course_id=${encodeURIComponent(courseId)}`);
    const data = typeof r.json?.payload === 'string' ? JSON.parse(r.json.payload) : r.json?.payload;
    const email = typeof data?.student_email === 'string' ? data.student_email.trim().toLowerCase() : '';
    return /^[^@\s]+@[^@\s]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}

/**
 * Reads every course. A course that fails is reported and the rest still sync; being signed out
 * stops the whole run, since every course would fail the same way. `email` is who NPTEL says is
 * signed in; it stays in the extension and is never sent to Lume.
 */
export async function readAll(courseIds, options = {}) {
  const courses = [];
  const items = [];
  for (const id of courseIds) {
    try {
      const course = await readCourse(id, options);
      courses.push({ id, name: course.name, ok: true });
      items.push(...course.items);
    } catch (err) {
      if (err instanceof SignedOut) return { error: err.message, courses: [], items: [] };
      if (err instanceof NotEnrolled) {
        courses.push({ id, name: options.names?.[id] ?? id, ok: false, notEnrolled: true, error: err.message });
        continue;
      }
      const error = err?.name === 'TimeoutError' ? 'NPTEL took too long to answer' : err instanceof TypeError && /fetch/i.test(err.message) ? 'Couldn’t reach NPTEL' : String(err?.message ?? err);
      courses.push({ id, name: options.names?.[id] ?? id, ok: false, error });
    }
  }
  const first = courses.find((c) => c.ok);
  const email = first ? await signedInEmail(first.id, options.get ?? fetchJson) : null;
  return { courses, items, email };
}
