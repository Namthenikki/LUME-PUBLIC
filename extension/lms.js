// Reads the posts in your MUJ LMS courses (each course's Activity Feed and Announcements) and their
// quizzes: the same calls the course pages make, sent with the Chrome session you're already signed
// in with. Lume looks for quiz announcements in the posts, takes each quiz's real start and end, and
// ticks a quiz done once you've attempted it. Nothing here logs in or stores a password.

export const LMS = 'https://mujlms.manipal.edu';
const FEED = 'https://prd.activityfeed.ap-south-1.brightspace.com/api/v1';
const LP = '1.64';
const LE = '1.67';
const MAX_HTML = 20_000;

export class LmsSignedOut extends Error {
  constructor() {
    super('Signed out of MUJ LMS. Open mujlms.manipal.edu in Chrome and log in');
  }
}

/** Plain fetch from the extension: Chrome attaches your LMS cookies because of host_permissions. */
export async function request(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    credentials: url.startsWith(LMS) ? 'include' : 'omit',
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  return { status: res.status, url: res.url, text: await res.text() };
}

// A lapsed session lands on the login page, or on a page whose script sends you there.
const isLogin = (r) => !r.url.startsWith(LMS) || r.url.includes('/d2l/login') || /location\.replace\(\s*'\/d2l\/login/.test(r.text.slice(0, 2000));

function json(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A short-lived token for the Activity Feed, issued to your LMS session like the course page gets one. */
async function feedToken(get) {
  const home = await get(`${LMS}/d2l/home`);
  if (isLogin(home)) throw new LmsSignedOut();
  const xsrf = /XSRF\.Token['"]\s*,\s*['"]([^'"]+)/.exec(home.text)?.[1];
  if (!xsrf) throw new Error('The LMS home page changed, so Lume can’t read it');
  const r = await get(`${LMS}/d2l/lp/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': xsrf },
    body: 'scope=*:*:*',
  });
  const token = json(r.text)?.access_token;
  if (!token) throw isLogin(r) ? new LmsSignedOut() : new Error(`The LMS answered ${r.status} for a token`);
  return token;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAY = 86_400_000;

/** This semester's courses only: their codes end in their term, like "…_July_Dec_2026". */
function isCurrent(code, now) {
  const m = /_([a-z]{3})[a-z]*_([a-z]{3})[a-z]*_(\d{4})$/i.exec(code ?? '');
  if (!m) return true;
  const [from, to, year] = [MONTHS.indexOf(m[1].toLowerCase()), MONTHS.indexOf(m[2].toLowerCase()), Number(m[3])];
  if (from < 0 || to < 0) return true;
  const start = Date.UTC(year, from, 1);
  const end = Date.UTC(to < from ? year + 1 : year, to + 1, 1);
  return now > start - 30 * DAY && now < end + 30 * DAY;
}

async function myCourses(get, now) {
  const items = [];
  let bookmark = '';
  do {
    const r = await get(`${LMS}/d2l/api/lp/${LP}/enrollments/myenrollments/?orgUnitTypeId=3${bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : ''}`);
    if (r.status === 401 || r.status === 403 || isLogin(r)) throw new LmsSignedOut();
    const j = json(r.text);
    if (!j?.Items) throw new Error(`The LMS answered ${r.status} for your courses`);
    items.push(...j.Items);
    bookmark = j.PagingInfo?.HasMoreItems ? j.PagingInfo.Bookmark : '';
  } while (bookmark);
  return items
    .filter((i) => i.Access?.IsActive !== false && i.Access?.CanAccess !== false && isCurrent(i.OrgUnit?.Code, now))
    .map((i) => ({ id: String(i.OrgUnit.Id), name: String(i.OrgUnit.Name ?? '').trim() || `Course ${i.OrgUnit.Id}` }));
}

/** A course's latest Activity Feed posts and its announcements. */
async function coursePosts(course, token, get) {
  const posts = [];
  const feed = await get(`${FEED}/d2l:orgUnit:${course.id}/article?pageSize=20`, { headers: { authorization: `Bearer ${token}` } });
  if (feed.status === 200) {
    for (const a of json(feed.text)?.orderedItems ?? []) {
      const id = /\/article\/([\w-]+)$/.exec(a?.id ?? '')?.[1];
      if (!id || typeof a.object?.content !== 'string') continue;
      posts.push({ id: `feed:${id}`, courseId: course.id, title: '', html: a.object.content.slice(0, MAX_HTML), publishedAt: a.published, updatedAt: a.object.updated ?? null });
    }
  } else if (feed.status !== 404) throw new Error(`the Activity Feed answered ${feed.status}`);

  const news = await get(`${LMS}/d2l/api/le/${LE}/${course.id}/news/`);
  if (news.status === 200) {
    for (const n of json(news.text) ?? []) {
      if (n.IsHidden || n.IsPublished === false) continue;
      const html = n.Body?.Html || n.Body?.Text || '';
      posts.push({ id: `news:${n.Id}`, courseId: course.id, title: String(n.Title ?? '').slice(0, 300), html: html.slice(0, MAX_HTML), publishedAt: n.StartDate || n.CreatedDate, updatedAt: n.LastModifiedDate ?? null });
    }
  } else if (news.status !== 403 && news.status !== 404) throw new Error(`Announcements answered ${news.status}`); // 403: the course has them turned off
  return posts.filter((p) => p.publishedAt && !Number.isNaN(Date.parse(p.publishedAt)));
}

const tagless = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The course's Quizzes page, which lists only the quizzes you can see: your attempts at each (its
 * Attempts column reads "1 / 1", attempts made / allowed), keyed by quiz id, and whether a quiz is
 * on the page at all. A quiz that hasn't opened yet may have no link, so it's also found by its
 * name. The page is plain HTML, read with patterns since the extension's background has no HTML parser.
 */
function readQuizzesPage(html) {
  const attempts = {};
  const ids = new Set();
  const names = [];
  for (const row of html.split(/<tr[\s>]/i).slice(1)) {
    const body = row.split(/<\/tr>/i)[0];
    const cells = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (cells.length === 0) continue; // a heading row
    names.push(tagless(cells[0][1]));
    const id = /GoToQuiz\((\d+)/.exec(body)?.[1] ?? /[?&;]qi=(\d+)/.exec(body)?.[1];
    if (!id) continue;
    ids.add(id);
    const made = /^(\d+)\s*\//.exec(tagless(cells.at(-1)[1]))?.[1];
    if (made !== undefined) attempts[id] = Number(made);
  }
  const listed = (id, name) => ids.has(id) || (name !== '' && names.some((n) => n.startsWith(name)));
  return { attempts, listed };
}

/**
 * A course's quizzes in the Quizzes tool: when each opens and closes (the calendar often leaves the
 * start out), and how many times you've attempted it, so Lume can tick it done.
 */
async function courseQuizzes(course, get) {
  const list = [];
  let url = `${LMS}/d2l/api/le/${LE}/${course.id}/quizzes/`;
  for (let page = 0; url && page < 5; page++) {
    const r = await get(url);
    if (r.status === 403 || r.status === 404) return []; // the course has no Quizzes tool
    const j = json(r.text);
    if (r.status !== 200 || !Array.isArray(j?.Objects)) throw isLogin(r) ? new LmsSignedOut() : new Error(`the Quizzes tool answered ${r.status}`);
    list.push(...j.Objects);
    url = typeof j.Next === 'string' && j.Next.startsWith(LMS) ? j.Next : null;
  }
  if (list.length === 0) return [];

  const page = await get(`${LMS}/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${course.id}`);
  if (isLogin(page)) throw new LmsSignedOut();
  // Without the page, attempts and what you can see are unknown (null), not "none".
  const seen = page.status === 200 ? readQuizzesPage(page.text) : null;
  return list
    .filter((q) => Number.isSafeInteger(q?.QuizId))
    .map((q) => {
      const id = String(q.QuizId);
      const name = String(q.Name ?? '').trim().slice(0, 300);
      return {
        courseId: course.id,
        id,
        name,
        active: q.IsActive !== false,
        startsAt: q.StartDate ?? null,
        endsAt: q.EndDate ?? null,
        dueAt: q.DueDate ?? null,
        attempts: seen?.attempts[id] ?? null,
        listed: seen ? seen.listed(id, name) : null,
      };
    });
}

/**
 * Every current course's posts and quizzes. A course that fails is reported and the rest still go;
 * a course whose quizzes fail still sends its posts (`quizzesError` says why). Being signed out
 * stops the whole run, since every course would fail the same way.
 */
export async function readLms({ get = request, now = Date.now() } = {}) {
  try {
    const token = await feedToken(get);
    const me = json((await get(`${LMS}/d2l/api/lp/${LP}/users/whoami`)).text);
    const who = me?.Identifier ? { id: String(me.Identifier), name: `${me.FirstName ?? ''} ${me.LastName ?? ''}`.trim() || 'another student' } : null;
    const courses = [];
    const posts = [];
    const quizzes = [];
    for (const course of await myCourses(get, now)) {
      try {
        posts.push(...(await coursePosts(course, token, get)));
        let quizzesError;
        try {
          quizzes.push(...(await courseQuizzes(course, get)));
        } catch (err) {
          if (err instanceof LmsSignedOut) throw err;
          quizzesError = describe(err);
        }
        courses.push({ ...course, ok: true, ...(quizzesError ? { quizzesError } : {}) });
      } catch (err) {
        if (err instanceof LmsSignedOut) throw err;
        courses.push({ ...course, ok: false, error: describe(err) });
      }
    }
    return { who, courses, posts, quizzes };
  } catch (err) {
    return { error: describe(err), signedOut: err instanceof LmsSignedOut, courses: [], posts: [], quizzes: [] };
  }
}

function describe(err) {
  if (err?.name === 'TimeoutError') return 'The LMS took too long to answer';
  if (err instanceof TypeError && /fetch/i.test(err.message)) return 'Couldn’t reach the LMS';
  return String(err?.message ?? err);
}
