import { enrolledCourseFromUrl, ORIGIN, readAll } from './nptel.js';

// Syncs NPTEL deadlines to Lume every 3 hours while Chrome is open, when Chrome starts, and when you
// open one of your NPTEL courses. After a failure it tries again sooner.
const EVERY_MINUTES = 180;
const RETRY_MINUTES = 20;
const VISIT_RESYNC_MS = 60 * 60_000;
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

// Opening a course on NPTEL adds it, and refreshes Lume if the last sync is over an hour old.
chrome.tabs.onUpdated.addListener(async (_tabId, change, tab) => {
  if (change.status !== 'complete') return;
  const id = enrolledCourseFromUrl(tab.url);
  if (!id) return;
  const { courses } = await getConfig();
  if (!courses.some((c) => c.id === id)) {
    await store.set({ courses: [...courses, { id, name: id }] });
    return sync('new course');
  }
  const { state } = await store.get('state');
  if (!state || Date.now() - state.at > VISIT_RESYNC_MS) sync('visit');
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

let running = null;

/** One sync at a time; a second request while one runs gets the same result. */
function sync(reason) {
  running ??= run(reason).finally(() => (running = null));
  return running;
}

async function run(reason) {
  const config = await getConfig();
  const { cache = {} } = await store.get('cache');
  const at = Date.now();
  const names = Object.fromEntries(config.courses.map((c) => [c.id, c.name]));

  if (!config.key) return finish({ at, ok: false, setup: true, message: 'Paste your connection code from Lume → Settings → NPTEL' });
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
  chrome.action.setBadgeText({ text: state.ok ? '' : '!' });
  chrome.action.setBadgeBackgroundColor({ color: state.setup ? '#1d6ef5' : '#f04438' });
  chrome.action.setTitle({ title: state.ok ? 'Lume for NPTEL: synced' : `Lume for NPTEL: ${state.message}` });
  if (!state.ok && !state.setup) await chrome.alarms.create('retry', { delayInMinutes: RETRY_MINUTES });
  return state;
}
