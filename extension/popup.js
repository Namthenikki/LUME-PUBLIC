import { courseIdFrom, ORIGIN } from './nptel.js';

const store = chrome.storage.local;
const app = document.getElementById('app');
const pill = document.getElementById('pill');
const $ = (id) => document.getElementById(id);

const IST = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
const TIME = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });

function ago(at) {
  const min = Math.round((Date.now() - at) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function left(dueAt) {
  const min = (Date.parse(dueAt) - Date.now()) / 60_000;
  if (min < 60) return { text: `${Math.max(1, Math.round(min))} min left`, tone: 'urgent' };
  if (min < 24 * 60) return { text: `${Math.round(min / 60)} h left`, tone: min < 6 * 60 ? 'urgent' : 'soon' };
  const days = Math.round(min / 1440);
  return { text: `${days} ${days === 1 ? 'day' : 'days'} left`, tone: '' };
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

/** "https://lume.app#key" from Settings, or just the key. */
function parseCode(text) {
  const code = text.trim();
  const [url, key] = code.includes('#') ? code.split('#', 2) : [null, code];
  // The key is `<student id>.<signature>`.
  if (!/^[A-Za-z0-9_.-]{20,}$/.test(key ?? '')) return null;
  if (url !== null && !/^https?:\/\/[^\s/]+$/.test(url.replace(/\/+$/, ''))) return null;
  return { key, lumeUrl: url?.replace(/\/+$/, '') };
}

async function render() {
  const { key, courses = [], state, lumeUrl } = await store.get(['key', 'courses', 'state', 'lumeUrl']);
  app.replaceChildren();
  if (!key) return renderConnect();

  app.append($('main').content.cloneNode(true));

  // Status
  const syncing = render.syncing;
  const bad = state && !state.ok && !state.setup;
  pill.hidden = !state && !syncing;
  pill.className = `pill ${syncing ? 'setup' : state?.ok ? 'ok' : bad ? 'bad' : 'setup'}`;
  pill.textContent = syncing ? 'Syncing…' : state?.ok ? 'Synced' : bad ? 'Needs attention' : 'Set up';

  const upcoming = (state?.items ?? []).filter((i) => Date.parse(i.dueAt) > Date.now());
  const pending = upcoming.filter((i) => !i.submitted);
  $('status-title').textContent = syncing ? 'Syncing with NPTEL…' : state ? `Last checked ${ago(state.at)}` : 'Not synced yet';
  $('status-sub').textContent =
    state?.ok || (state && !state.setup && !state.signedOut)
      ? `${pending.length} upcoming ${pending.length === 1 ? 'assignment' : 'assignments'} to do, across ${courses.length} ${courses.length === 1 ? 'course' : 'courses'}. Lume reminds you on your phone.`
      : 'Syncs every 3 hours while Chrome is open.';
  if (state && !state.ok && state.message) {
    $('status-error').hidden = false;
    $('status-error').textContent = `${state.message.replace(/\.$/, '')}.`;
  }
  if (state?.signedOut) {
    const login = $('login');
    login.hidden = false;
    login.href = courses[0] ? `${ORIGIN}/${courses[0].id}/course` : `${ORIGIN}/e-learning`;
  }
  const syncBtn = $('sync');
  syncBtn.disabled = !!syncing;
  syncBtn.textContent = syncing ? 'Syncing…' : 'Sync now';
  syncBtn.addEventListener('click', syncNow);

  // Coming up
  if (upcoming.length) {
    $('upcoming-card').hidden = false;
    $('upcoming').append(
      ...upcoming.slice(0, 6).map((i) => {
        const l = left(i.dueAt);
        return el(
          'li',
          {},
          el(
            'div',
            { class: 'grow' },
            el('a', { class: 'title', href: i.url, target: '_blank', style: 'color:inherit;text-decoration:none' }, i.title),
            el('p', { class: 'meta' }, i.course),
            i.submitted ? el('span', { class: 'tag done' }, 'Submitted') : null,
          ),
          el('div', { class: 'when' }, el('b', { class: i.submitted ? '' : l.tone }, l.text), `${IST.format(new Date(i.dueAt))}, ${TIME.format(new Date(i.dueAt))}`),
        );
      }),
    );
  }

  // Courses
  const failed = new Map((state?.courses ?? []).filter((c) => !c.ok).map((c) => [c.id, c.error]));
  $('courses').append(
    ...(courses.length
      ? courses.map((c) =>
          el(
            'li',
            {},
            el(
              'div',
              { class: 'grow' },
              el('p', { class: 'title' }, c.name === c.id ? 'New course' : c.name),
              el('p', { class: 'meta' }, c.id),
              failed.has(c.id) ? el('span', { class: 'tag bad', title: failed.get(c.id) }, 'Couldn’t read') : null,
            ),
            el('button', { class: 'remove', type: 'button', title: `Stop syncing ${c.id}`, 'aria-label': `Remove ${c.id}`, onclick: () => removeCourse(c.id) }, '×'),
          ),
        )
      : [el('li', { class: 'empty' }, 'No courses yet. Open each NPTEL course once, or add it here.')]),
  );
  $('add-form').addEventListener('submit', addCourse);
  $('lume-host').textContent = `Sends to ${(lumeUrl ?? '').replace(/^https?:\/\//, '') || 'Lume'}`;
  $('disconnect').addEventListener('click', async () => {
    await store.remove('key');
    render();
  });
}

function renderConnect() {
  pill.hidden = true;
  app.append($('connect').content.cloneNode(true));
  $('code').focus();
  $('connect-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const parsed = parseCode($('code').value);
    if (!parsed) {
      $('connect-error').hidden = false;
      $('connect-error').textContent = 'That doesn’t look like a connection code. Copy it again from Lume → Settings.';
      return;
    }
    await store.set(parsed.lumeUrl ? parsed : { key: parsed.key });
    syncNow();
  });
}

async function syncNow() {
  render.syncing = true;
  await render();
  await chrome.runtime.sendMessage({ type: 'sync' }).catch(() => {});
  render.syncing = false;
  render();
}

async function addCourse(e) {
  e.preventDefault();
  const id = courseIdFrom($('add-input').value);
  if (!id) {
    $('add-error').hidden = false;
    $('add-error').textContent = 'Paste a course link from NPTEL, or an id like noc26_cs17.';
    return;
  }
  const { courses = [] } = await store.get('courses');
  if (!courses.some((c) => c.id === id)) await store.set({ courses: [...courses, { id, name: id }] });
  syncNow();
}

async function removeCourse(id) {
  const { courses = [] } = await store.get('courses');
  await store.set({ courses: courses.filter((c) => c.id !== id) });
  syncNow();
}

render();
