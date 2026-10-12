// Lume service worker: shows reminder notifications and handles their buttons, and shows Lume's own
// offline screen (public/offline.html) when a page can't load: no internet, a dropped connection, or a very slow one.
// Reminders arrive as FCM data-only messages, so this worker draws them itself (with actions).

const OFFLINE_CACHE = 'lume-offline-v1'; // change it whenever offline.html changes
const OFFLINE_PAGE = '/offline.html';
const OFFLINE_FILES = [OFFLINE_PAGE, '/fonts/figtree-latin.woff2'];
const SLOW_MS = 6000; // no answer by then: show the "taking longer" screen while the page keeps loading behind it
const GIVE_UP_MS = 45000; // still no answer: count it as failed (Chrome's own limit is minutes)
const KEEP_MS = 60000; // how long a page that arrived behind the offline screen waits to be picked up

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_FILES.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) =>
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Starts each page's request while the worker boots, so handling pages adds no delay to opening Lume.
      self.registration.navigationPreload && self.registration.navigationPreload.enable(),
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('lume-offline-') && key !== OFFLINE_CACHE).map((key) => caches.delete(key)))),
    ]),
  ),
);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/__lume/wait') return event.respondWith(waitFor(url.searchParams.get('u'), url.searchParams.has('retry')));
  if (OFFLINE_FILES.includes(url.pathname)) return event.respondWith(caches.match(request, { cacheName: OFFLINE_CACHE }).then((hit) => hit || fetch(request)));
  if (request.mode === 'navigate' && request.method === 'GET' && !/^\/(api|downloads)\//.test(url.pathname)) event.respondWith(openPage(event));
});

/** Pages still loading (or just arrived) behind the offline screen, by URL, so the screen can pick them up without asking again. */
const loads = new Map();

async function openPage(event) {
  const url = event.request.url;
  const preload = Promise.resolve(event.preloadResponse);
  const kept = loads.get(url);
  const reuse = kept && kept.state !== 'failed' && Date.now() - kept.at < KEEP_MS;
  if (reuse) preload.catch(() => {}); // not needed: Chrome cancels it once this page is answered
  const load = reuse ? kept : track(url, (signal) => preload.then((res) => res || fetch(event.request, { signal })));
  event.waitUntil(load.done); // keeps the worker alive until the page arrives, even behind the offline screen

  await Promise.race([load.done, sleep(SLOW_MS)]);
  if (load.state === 'ready') return take(load) || fetch(event.request);
  if (load.state === 'pending') load.behind = true;
  return offlineScreen(load.state === 'pending' ? 'slow' : 'offline');
}

/**
 * Starts loading a page and remembers it. A page with no answer after GIVE_UP_MS counts as failed.
 * `behind`: nothing is showing this page yet (the offline screen is), so it's read in full as it arrives:
 * the browser cuts off a page's body once the event that asked for it is over.
 */
function track(url, start, behind = false) {
  for (const [key, old] of loads) if (old.state !== 'pending' && Date.now() - old.at > KEEP_MS) loads.delete(key);
  const controller = new AbortController();
  const load = { url, at: Date.now(), state: 'pending', response: null, controller, behind };
  const answer = start(controller.signal)
    .then(async (res) => {
      const keep = load.behind && res.type !== 'opaqueredirect' && res.body;
      const response = keep ? new Response(await res.arrayBuffer(), { status: res.status, statusText: res.statusText, headers: res.headers }) : res;
      Object.assign(load, { state: 'ready', response, at: Date.now() });
    })
    .catch(() => {
      if (load.state === 'pending') load.state = 'failed';
    });
  const giveUp = sleep(GIVE_UP_MS).then(() => {
    if (load.state !== 'pending') return;
    load.state = 'failed';
    controller.abort();
  });
  load.done = Promise.race([answer, giveUp]);
  loads.set(url, load);
  return load;
}

/** Hands a page's response out once: a response can only be read once. */
function take(load) {
  const res = load.response;
  load.response = null;
  if (loads.get(load.url) === load) loads.delete(load.url);
  return res;
}

/** The offline screen's question: has the page arrived? With retry, it asks the network again first. */
async function waitFor(target, retry) {
  const url = sameOrigin(target);
  let load = url ? loads.get(url) : undefined;
  if (url && retry && load?.state !== 'ready') {
    load?.controller.abort();
    load = track(url, (signal) => fetch(url, { signal, redirect: 'manual', headers: { accept: 'text/html' } }), true);
  }
  // A fresh try answers within SLOW_MS, so the screen can say "slow"; otherwise wait longer for the page.
  if (load?.state === 'pending') await Promise.race([load.done, sleep(retry ? SLOW_MS : 20000)]);
  return new Response(JSON.stringify({ state: load ? load.state : 'none' }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-lume-wait': '1' },
  });
}

async function offlineScreen(mode) {
  const cached = await caches.match(OFFLINE_PAGE, { cacheName: OFFLINE_CACHE });
  const html = cached
    ? await cached.text()
    : '<!doctype html><meta name="viewport" content="width=device-width"><title>Lume</title><p style="font:16px system-ui;padding:24px">Can\'t reach Lume. Check your internet, then <a href="">try again</a>.</p>';
  return new Response(html.replace('data-mode="offline"', `data-mode="${mode}"`), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function sameOrigin(value) {
  try {
    const url = new URL(value);
    return url.origin === self.location.origin ? url.href.split('#')[0] : null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  // FCM wraps data messages as { data: {...}, from, fcmMessageId }.
  const d = payload.data || payload;
  if (!d.title) return;

  event.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      tag: d.tag,
      renotify: d.silent !== '1',
      silent: d.silent === '1', // quiet hours (12 AM to 8 AM IST): no sound or vibration
      requireInteraction: d.sticky === '1',
      icon: '/icons/192.png',
      badge: '/icons/badge.png',
      data: d,
      actions: d.taskId
        ? [
            { action: 'done', title: 'Mark done' },
            { action: 'snooze', title: 'Remind in 2h' },
          ]
        : [],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  const d = event.notification.data || {};
  event.notification.close();

  if ((event.action === 'done' || event.action === 'snooze') && d.taskId) {
    event.waitUntil(
      fetch(`/api/tasks/${d.taskId}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: event.action, token: d.actionToken }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return refreshOpenApps();
        })
        .catch(() =>
          self.registration.showNotification("Couldn't update the task", {
            body: 'Open Lume to mark it there.',
            tag: `${d.tag}-error`,
            icon: '/icons/192.png',
            badge: '/icons/badge.png',
            data: { url: d.url },
          }),
        ),
    );
    return;
  }

  // Tapping the notification itself opens the dashboard at that task.
  const url = d.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.navigate(url).then((w) => (w || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});

/** Tells open Lume windows to reload their data after a notification button changed a task. */
function refreshOpenApps() {
  return self.clients.matchAll({ type: 'window' }).then((windows) => windows.forEach((w) => w.postMessage({ type: 'lume:refresh' })));
}
