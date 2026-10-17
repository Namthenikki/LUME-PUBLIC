import { FieldPath, type Timestamp } from 'firebase-admin/firestore';
import androidRelease from './android-release.json';
import { db } from './firebase-admin';
import { HOUR, IST_OFFSET, istDateKey, istDayNumber } from './time';
import { activityCollection, usersCollection } from './users';

/*
 * The owner's usage page (/stats): how many students Lume Public has and how many use it. Read on
 * demand, about six reads per student per view. "Active" means they opened Lume that day
 * (touchUser), so a phone syncing in the background doesn't count. The owner's own account, named in
 * `meta/stats.ownerUid`, is listed but left out of every number.
 */

const DAY = 24 * HOUR;
export const CHART_DAYS = 14;

/** When an IST day (istDayNumber) starts, in epoch ms. */
export const dayStart = (day: number) => day * DAY - IST_OFFSET;

export type StudentRow = {
  /** "S1", "S2"… in the order they joined, or "You". */
  label: string;
  you: boolean;
  joinedAt: number;
  lastSeenAt: number;
  /** Their paired phone app: the newest version it reported, and when it last checked in. */
  phone: { version: number | null; lastSeenAt: number } | null;
  /** A browser with notifications turned on. */
  browser: boolean;
  /** The Chrome extension's last sync (NPTEL or LMS course posts). */
  extensionAt: number | null;
  tasks: number;
};

export type Stats = {
  at: number;
  students: number;
  newToday: number;
  newThisWeek: number;
  activeToday: number;
  activeWeek: number;
  withApp: number;
  /** Students whose phone app checked in within the last 24 hours. */
  appCheckedIn: number;
  /** Students whose phone runs the newest Android release. */
  onLatestApp: number;
  withExtension: number;
  /** Students whose extension synced within the last 2 days. */
  extensionRecent: number;
  /** Students reminded by their phone app or a browser. */
  reminded: number;
  tasks: number;
  latestApp: number;
  /** Students who opened Lume each day, oldest first. null: before daily counts began (2026-10-17). */
  daily: { day: number; active: number | null }[];
  /** Total students at the end of each day since the first one joined. */
  growth: { day: number; total: number; joined: number }[];
  /** Newest first. */
  rows: StudentRow[];
};

const ms = (t: unknown) => (t as Timestamp).toMillis();

export async function loadStats(now = Date.now()): Promise<Stats> {
  const today = istDayNumber(now);
  const firstChartDay = today - CHART_DAYS + 1;
  const [users, phones, browsers, recentDays, firstDay, config] = await Promise.all([
    usersCollection().select('createdAt', 'lastSeenAt').get(),
    db().collection('alarmDevices').select('uid', 'lastSeenAt', 'appVersion').get(),
    db().collection('devices').select('uid').get(),
    activityCollection().where(FieldPath.documentId(), '>=', istDateKey(dayStart(firstChartDay))).get(),
    activityCollection().orderBy(FieldPath.documentId()).limit(1).select().get(),
    db().collection('meta').doc('stats').get(),
  ]);
  const ownerUid = config.get('ownerUid') as string | undefined;

  const userDocs = [...users.docs].sort((a, b) => ms(a.get('createdAt')) - ms(b.get('createdAt')));
  const [extension, taskCounts] = await Promise.all([
    userDocs.length
      ? db().getAll(...userDocs.flatMap((u) => ['sync-nptel', 'sync-manipal-posts'].map((id) => u.ref.collection('meta').doc(id))), { fieldMask: ['at'] })
      : [],
    Promise.all(userDocs.map((u) => u.ref.collection('tasks').count().get())),
  ]);

  let n = 0;
  const rows = userDocs.map((u, i): StudentRow => {
    const own = phones.docs.filter((d) => d.get('uid') === u.id);
    const versions = own.map((d) => d.get('appVersion')).filter((v): v is number => typeof v === 'number');
    const synced = extension
      .slice(i * 2, i * 2 + 2)
      .map((d) => d.get('at'))
      .filter((at): at is number => typeof at === 'number');
    return {
      label: u.id === ownerUid ? 'You' : `S${++n}`,
      you: u.id === ownerUid,
      joinedAt: ms(u.get('createdAt')),
      lastSeenAt: ms(u.get('lastSeenAt')),
      phone: own.length ? { version: versions.length ? Math.max(...versions) : null, lastSeenAt: Math.max(...own.map((d) => ms(d.get('lastSeenAt')))) } : null,
      browser: browsers.docs.some((d) => d.get('uid') === u.id),
      extensionAt: synced.length ? Math.max(...synced) : null,
      tasks: taskCounts[i].data().count,
    };
  });
  const students = rows.filter((r) => !r.you);
  const count = (test: (r: StudentRow) => boolean) => students.filter(test).length;
  const seenDay = (r: StudentRow) => istDayNumber(r.lastSeenAt);

  // Daily active: who touchUser recorded that day, plus anyone whose last visit was that day (new
  // students are active on the day they join, and today's count matches the tile above).
  const tracked = new Map(recentDays.docs.map((d) => [istDayNumber(Date.parse(`${d.id}T00:00:00+05:30`)), new Set(d.get('uids') as string[])]));
  const trackingFrom = firstDay.empty ? today : istDayNumber(Date.parse(`${firstDay.docs[0].id}T00:00:00+05:30`));
  const daily = Array.from({ length: CHART_DAYS }, (_, k) => {
    const day = firstChartDay + k;
    if (day < trackingFrom) return { day, active: null };
    const uids = tracked.get(day) ?? new Set<string>();
    const active = userDocs.filter((u, i) => !rows[i].you && (uids.has(u.id) || seenDay(rows[i]) === day)).length;
    return { day, active };
  });

  const joinDays = students.map((r) => istDayNumber(r.joinedAt));
  const growth = joinDays.length
    ? Array.from({ length: today - Math.min(...joinDays) + 1 }, (_, k) => {
        const day = Math.min(...joinDays) + k;
        return { day, total: joinDays.filter((d) => d <= day).length, joined: joinDays.filter((d) => d === day).length };
      })
    : [];

  return {
    at: now,
    students: students.length,
    newToday: joinDays.filter((d) => d === today).length,
    newThisWeek: joinDays.filter((d) => d > today - 7).length,
    activeToday: count((r) => seenDay(r) === today),
    activeWeek: count((r) => seenDay(r) > today - 7),
    withApp: count((r) => r.phone !== null),
    appCheckedIn: count((r) => r.phone !== null && now - r.phone.lastSeenAt < DAY),
    onLatestApp: count((r) => r.phone?.version === androidRelease.versionCode),
    withExtension: count((r) => r.extensionAt !== null),
    extensionRecent: count((r) => r.extensionAt !== null && now - r.extensionAt < 2 * DAY),
    reminded: count((r) => r.phone !== null || r.browser),
    tasks: students.reduce((sum, r) => sum + r.tasks, 0),
    latestApp: androidRelease.versionCode,
    daily,
    growth,
    rows: [...rows].reverse(),
  };
}
