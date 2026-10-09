// Reads the posts in your MUJ LMS courses (each course's Activity Feed and Announcements): the same
// calls the course home page makes, sent with the Chrome session you're already signed in with.
// Lume looks for quiz announcements in them. Nothing here logs in or stores a password.

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

/**
 * Every current course's posts. A course that fails is reported and the rest still go; being
 * signed out stops the whole run, since every course would fail the same way.
 */
export async function readLms({ get = request, now = Date.now() } = {}) {
  try {
    const token = await feedToken(get);
    const me = json((await get(`${LMS}/d2l/api/lp/${LP}/users/whoami`)).text);
    const who = me?.Identifier ? { id: String(me.Identifier), name: `${me.FirstName ?? ''} ${me.LastName ?? ''}`.trim() || 'another student' } : null;
    const courses = [];
    const posts = [];
    for (const course of await myCourses(get, now)) {
      try {
        posts.push(...(await coursePosts(course, token, get)));
        courses.push({ ...course, ok: true });
      } catch (err) {
        if (err instanceof LmsSignedOut) throw err;
        courses.push({ ...course, ok: false, error: describe(err) });
      }
    }
    return { who, courses, posts };
  } catch (err) {
    return { error: describe(err), signedOut: err instanceof LmsSignedOut, courses: [], posts: [] };
  }
}

function describe(err) {
  if (err?.name === 'TimeoutError') return 'The LMS took too long to answer';
  if (err instanceof TypeError && /fetch/i.test(err.message)) return 'Couldn’t reach the LMS';
  return String(err?.message ?? err);
}
