import { LMS, readLms } from './lms.js';
import { enrolledCourseFromUrl, ORIGIN, readAll } from './nptel.js';

// Syncs NPTEL deadlines, and the posts in your MUJ LMS courses (for quizzes announced there), to
// Lume every 3 hours while Chrome is open, when Chrome starts, and when you open one of your NPTEL
// courses or the LMS. After a failure it tries again sooner.
const EVERY_MINUTES = 180;
const RETRY_MINUTES = 20;
const VISIT_RESYNC_MS = 60 * 60_000;
const VISIT_RETRY_MS = 2 * 60_000;
// Lume's address, filled in by scripts/build-extension.mjs (the connection code carries it too).
export const DEFAULT_LUME_URL = '';

const store = chrome.storage.local;
const getConfig = async () => ({ lumeUrl: DEFAULT_LUME_URL, key: '', courses: [], ...(await store.get(['lumeUrl', 'key', 'courses'])) });

async function ensureAlarm() {
  if (!(await chrome.alarms.get('sync'))) await chrome.alarms.create('sync', { periodInMinutes: EVERY_MINUTES, delayInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(() => ensureAlarm().then(() => sync('install')));
chrome.runtime.onStartup.addListener(() => ensureAlarm().then(() => sync('startup')));
chrome.alarms.onAlarm.addListener((a) => (a.name === 'sync' || a.name === 'retry') && sync(a.name));
ensureAlarm(); // Chrome may drop alarms on a restart; this puts it back whenever the extension wakes

// A visit syncs when the last result is over an hour old, or failed (say you were signed out and
// have just logged in) more than 2 minutes ago.
const dueOnVisit = (s) => !s || Date.now() - s.at > (s.ok ? VISIT_RESYNC_MS : VISIT_RETRY_MS);

// Any page on NPTEL or the LMS, including moves inside their single-page apps. Opening an NPTEL
// course you haven't synced before adds it.
chrome.tabs.onUpdated.addListener(async (_tabId, change, tab) => {
  if (change.status !== 'complete' && !change.url) return;
  const url = tab.url ?? '';
  if (url.startsWith(`${LMS}/d2l/`) && !url.includes('/d2l/login')) {
    const { lmsState } = await store.get('lmsState');
    if (dueOnVisit(lmsState)) syncLms('visit');
    return;
  }
  if (!url.startsWith(`${ORIGIN}/`)) return;
  const id = enrolledCourseFromUrl(url);
  const { courses } = await getConfig();
  if (id && !courses.some((c) => c.id === id)) {
    await store.set({ courses: [...courses, { id, name: id }] });
    return syncNptel('new course');
  }
  const { state } = await store.get('state');
  if (dueOnVisit(state)) syncNptel('visit');
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'sync') sync('manual').then(reply);
  return msg?.type === 'sync'; // keeps the channel open for the async reply
});

/** Fetches from inside an open NPTEL tab, for when Chrome won't attach cookies to the extension's own requests. */
const inTab = (tabId) => async (url) => {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [url],
    func: async (u) => {
      const res = await fetch(u, { credentials: 'include', cache: 'no-store' });
      return { status: res.status, text: await res.text(), redirected: res.redirected, url: res.url };
    },
  });
  if (result.redirected && !result.url.startsWith(ORIGIN)) return { status: 401, json: null };
  let json = null;
  try {
    json = JSON.parse(result.text);
  } catch {}
  return { status: result.status, json };
};

/** Fetches from inside an open LMS tab, for when Chrome won't attach cookies to the extension's own requests. */
const lmsInTab = (tabId) => async (url, init = {}) => {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [url, init],
    func: async (u, i) => {
      const res = await fetch(u, { ...i, credentials: u.startsWith(location.origin) ? 'include' : 'omit', cache: 'no-store' });
      return { status: res.status, url: res.url, text: await res.text() };
    },
  });
  return result;
};

let running = null;
let runningLms = null;

/** One sync of each kind at a time; a second request while one runs gets the same result. */
function syncNptel(reason) {
  running ??= run(reason).finally(() => (running = null));
  return running;
}

function syncLms(reason) {
  runningLms ??= runLms(reason).finally(() => (runningLms = null));
  return runningLms;
}

/** Both; answers with the NPTEL result, which the popup shows first. */
function sync(reason) {
  return Promise.all([syncNptel(reason), syncLms(reason)]).then(([nptel]) => nptel);
}

async function run(reason) {
  const config = await getConfig();
  const { cache = {} } = await store.get('cache');
  const at = Date.now();
  const names = Object.fromEntries(config.courses.map((c) => [c.id, c.name]));

  if (!config.key) return finish({ at, ok: false, setup: true, message: 'Paste your connection code from Lume → Settings → Lume extension' });
  if (config.courses.length === 0) return finish({ at, ok: false, setup: true, message: 'Open each of your NPTEL courses once in Chrome, or add them below' });

  const ids = config.courses.map((c) => c.id);
  let read = await readAll(ids, { cache, names });
  // Signed out as far as the extension can tell, but an NPTEL tab is open: try from inside it.
  if (read.error) {
    const [tab] = await chrome.tabs.query({ url: `${ORIGIN}/*` });
    if (tab?.id) read = await readAll(ids, { cache, names, get: inTab(tab.id) }).catch(() => read);
  }
  await store.set({ cache });

  // One student per extension. On a shared Chrome, a roommate signed in to NPTEL must not have their
  // deadlines posted into this Lume: the first account synced is the owner, and any other stops the sync.
  const { email, ...found } = read;
  read = found;
  if (email && !read.error) {
    const { owner } = await store.get('owner');
    if (!owner) await store.set({ owner: email });
    else if (owner !== email) {
      read = { error: 'NPTEL in this Chrome is signed in as a different student. Log in to NPTEL with your own account to keep syncing', courses: [], items: [] };
      await store.set({ ownerMismatch: { owner, now: email } });
    }
  }
  if (!read.error) await store.remove('ownerMismatch');

  // Courses the signed-in student isn't in (added from someone else's course page) are dropped.
  const dropped = new Set(read.courses.filter((c) => c.notEnrolled).map((c) => c.id));
  read = { ...read, courses: read.courses.filter((c) => !dropped.has(c.id)) };
  if (!read.error) {
    await store.set({
      courses: config.courses.filter((c) => !dropped.has(c.id)).map((c) => ({ ...c, name: read.courses.find((r) => r.id === c.id && r.ok)?.name ?? c.name })),
    });
  }

  // Tell Lume, which reminds you on your phone. Errors go too, so your phone hears about them.
  let posted;
  try {
    const res = await fetch(`${config.lumeUrl.replace(/\/+$/, '')}/api/ingest/nptel`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ version: chrome.runtime.getManifest().version, ...read }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.json().catch(() => ({}));
    posted = res.ok ? { ...body, ok: true } : { ok: false, error: body.error ?? `Lume answered ${res.status}` };
  } catch {
    posted = { ok: false, error: 'Couldn’t reach Lume. Check your internet connection' };
  }

  const failed = read.courses.filter((c) => !c.ok);
  const ok = !read.error && failed.length === 0 && posted.ok;
  const message = read.error ?? (failed.length ? `Couldn’t read ${failed.map((c) => c.name).join(', ')}: ${failed[0].error}` : posted.ok ? '' : posted.error);
  return finish({ at, ok, reason, message, signedOut: !!read.error, courses: read.courses, items: read.items, posted });
}

async function finish(state) {
  await store.set({ state });
  await showBadge();
  if (!state.ok && !state.setup) await chrome.alarms.create('retry', { delayInMinutes: RETRY_MINUTES });
  return state;
}

/** Reads your LMS course posts and sends them to Lume, which picks out the quizzes announced in them. */
async function runLms(reason) {
  const config = await getConfig();
  const at = Date.now();
  if (!config.key) return finishLms({ at, ok: false, setup: true, message: 'Paste your connection code from Lume → Settings → Lume extension' });

  let read = await readLms();
  // Signed out as far as the extension can tell, but an LMS tab is open: try from inside it.
  if (read.signedOut) {
    const [tab] = await chrome.tabs.query({ url: `${LMS}/d2l/*` });
    if (tab?.id) read = await readLms({ get: lmsInTab(tab.id) }).catch(() => read);
  }

  // One student per extension, like NPTEL: on a shared Chrome, a roommate signed in to the LMS must not
  // have their course posts read into this Lume. The first LMS account read is the owner.
  const { who, ...rest } = read;
  read = rest;
  if (who && !read.error) {
    const { lmsOwner } = await store.get('lmsOwner');
    if (!lmsOwner) await store.set({ lmsOwner: who });
    else if (lmsOwner.id !== who.id) {
      read = { error: `The LMS in this Chrome is signed in as ${who.name}, but this extension belongs to ${lmsOwner.name}. Log in to the LMS as ${lmsOwner.name} to keep syncing`, courses: [], posts: [] };
    }
  }

  // Errors go to Lume too, so the app can say when posts haven't been read for a while.
  let posted;
  try {
    const res = await fetch(`${config.lumeUrl.replace(/\/+$/, '')}/api/ingest/lms`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ version: chrome.runtime.getManifest().version, error: read.error, courses: read.courses, posts: read.posts }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.json().catch(() => ({}));
    posted = res.ok ? { ...body, ok: true } : { ok: false, error: body.error ?? `Lume answered ${res.status}` };
  } catch {
    posted = { ok: false, error: 'Couldn’t reach Lume. Check your internet connection' };
  }

  const failed = read.courses.filter((c) => !c.ok);
  const ok = !read.error && failed.length === 0 && posted.ok;
  const message = read.error ?? (failed.length ? `Couldn’t read ${failed.map((c) => c.name).join(', ')}: ${failed[0].error}` : posted.ok ? '' : posted.error);
  const { lmsState: previous } = await store.get('lmsState');
  return finishLms({
    at,
    ok,
    reason,
    message,
    signedOut: !!read.signedOut,
    courses: read.courses.length,
    posts: read.posts.length,
    // Kept from the last good run while signed out, so the popup still lists them.
    quizzes: posted.ok && !read.error ? (posted.quizzes ?? []) : (previous?.quizzes ?? []),
  });
}

async function finishLms(lmsState) {
  await store.set({ lmsState });
  await showBadge();
  if (!lmsState.ok && !lmsState.setup) await chrome.alarms.create('retry', { delayInMinutes: RETRY_MINUTES });
  return lmsState;
}

/** "!" on the toolbar icon while NPTEL or the LMS needs a look: red for a problem, blue for setup. */
async function showBadge() {
  const { state, lmsState } = await store.get(['state', 'lmsState']);
  const all = [state, lmsState].filter(Boolean);
  const problem = all.find((s) => !s.ok && !s.setup);
  const shown = problem ?? all.find((s) => !s.ok);
  chrome.action.setBadgeText({ text: shown ? '!' : '' });
  chrome.action.setBadgeBackgroundColor({ color: problem ? '#f04438' : '#1d6ef5' });
  chrome.action.setTitle({ title: shown ? `Lume: ${shown.message}` : 'Lume: synced' });
}
