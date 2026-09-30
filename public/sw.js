// Lume service worker: shows reminder notifications and handles their buttons.
// Reminders arrive as FCM data-only messages, so this worker draws them itself (with actions).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
