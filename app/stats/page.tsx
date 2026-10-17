import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { LumeMark } from '@/components/LumeMark';
import { type ChartPoint, DayChart } from '@/components/stats/DayChart';
import { Panel } from '@/components/app/ui';
import { isStatsKey, STATS_COOKIE } from '@/lib/auth';
import { dayStart, loadStats, type StudentRow } from '@/lib/stats';
import { dayIST, formatIST, istDayNumber } from '@/lib/time';

// The owner's usage page. Open it once as /stats?key=<statsKey()>; this browser then remembers it.
export const metadata: Metadata = { title: 'Usage', robots: { index: false, follow: false } };

export const viewport: Viewport = { themeColor: '#f3f3f5' };

export default async function StatsPage() {
  await connection();
  if (!isStatsKey((await cookies()).get(STATS_COOKIE)?.value)) notFound();
  const s = await loadStats();
  const pct = (part: number) => (s.students ? `${Math.round((part / s.students) * 100)}%` : '0%');
  const daily: ChartPoint[] = s.daily.map((d) => ({ label: dayIST(dayStart(d.day)), value: d.active }));
  const growth: ChartPoint[] = s.growth.map((d) => ({ label: dayIST(dayStart(d.day)), value: d.total, note: d.joined ? `+${d.joined} joined` : 'No one joined' }));
  const countedFrom = s.daily[0].active === null ? daily.find((d) => d.value !== null)?.label.slice(4) : null;

  return (
    <div className="dots min-h-dvh bg-panel text-ink">
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-12 pt-5 sm:px-6 lg:px-9 lg:pt-8">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <LumeMark className="size-8 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.02em]">Lume Public usage</h1>
              <p className="text-[13px] text-ink-2">As of {formatIST(s.at)}</p>
            </div>
          </div>
          <a href="/stats" className="flex min-h-10 shrink-0 items-center rounded-xl bg-card px-3.5 text-[13px] font-semibold shadow-card">
            Refresh
          </a>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Students" value={s.students} sub={`+${s.newThisWeek} this week · +${s.newToday} today`} hero />
          <Tile label="Active today" value={s.activeToday} sub={`${pct(s.activeToday)} opened Lume today`} />
          <Tile label="Active this week" value={s.activeWeek} sub={`${pct(s.activeWeek)} opened it in 7 days`} />
          <Tile label="Deadlines tracked" value={s.tasks} sub={s.students ? `About ${Math.round(s.tasks / s.students)} per student` : '—'} />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Panel title="Daily active students">
            <p className="-mt-2 mb-4 text-[12.5px] text-ink-3">
              Opened Lume that day, last {s.daily.length} days{countedFrom ? `. Daily counts began on ${countedFrom}.` : ''}
            </p>
            <DayChart points={daily} kind="bars" unit={['student', 'students']} />
          </Panel>
          <Panel title="Students over time">
            <p className="-mt-2 mb-4 text-[12.5px] text-ink-3">Total at the end of each day, since the first one joined</p>
            <DayChart points={growth} kind="area" unit={['student', 'students']} />
          </Panel>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Phone app" value={s.withApp} sub={`${s.appCheckedIn} checked in within 24 h`} />
          <Tile label="On the latest app" value={s.onLatestApp} sub={`of ${s.withApp} with the app`} />
          <Tile label="Chrome extension" value={s.withExtension} sub={`${s.extensionRecent} synced in the last 2 days`} />
          <Tile label="Get reminders" value={s.reminded} sub={`${s.students - s.reminded} have no app or browser alerts`} />
        </div>

        <Panel title="Students" className="mt-3" action={<span className="text-[12.5px] text-ink-3">Newest first</span>}>
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <table className="w-full min-w-[620px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-ink-3">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 pr-3 font-medium">Last opened</th>
                  <th className="py-2 pr-3 font-medium">Reminders</th>
                  <th className="py-2 pr-3 font-medium">Extension</th>
                  <th className="py-2 text-right font-medium">Deadlines</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <Row key={r.label} r={r} now={s.at} latest={s.latestApp} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            S-numbers follow the order students joined. Lume doesn&apos;t know names: the LMS link is the only identity.
            {s.rows.some((r) => r.you) && ' Your own account is listed but not counted.'}
          </p>
        </Panel>
      </main>
    </div>
  );
}

function Tile({ label, value, sub, hero = false }: { label: string; value: number; sub: string; hero?: boolean }) {
  return (
    <section className="flex min-w-0 flex-col rounded-[20px] bg-card p-4 shadow-card sm:p-5">
      <h2 className="text-[13px] font-medium text-ink-2">{label}</h2>
      <p className={`mt-auto pt-2 font-semibold leading-none ${hero ? 'text-[48px] tracking-[-0.035em]' : 'text-[32px] tracking-[-0.025em]'}`}>{value}</p>
      <p className="mt-2 text-[12.5px] leading-snug text-ink-3">{sub}</p>
    </section>
  );
}

function Row({ r, now, latest }: { r: StudentRow; now: number; latest: number }) {
  const days = istDayNumber(now) - istDayNumber(r.lastSeenAt);
  return (
    <tr className={`border-b border-line last:border-0 ${r.you ? 'text-ink-3' : ''}`}>
      <td className="whitespace-nowrap py-2.5 pr-3 font-semibold">
        {r.label}
        {r.you && <span className="ml-2 rounded-full bg-chip px-2 py-0.5 text-[11px] font-medium text-ink-2">not counted</span>}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-2">{dayIST(r.joinedAt)}</td>
      <td className="whitespace-nowrap py-2.5 pr-3">
        <span className={`mr-2 inline-block size-2 rounded-full ${days === 0 ? 'bg-green' : days < 7 ? 'bg-ink-3' : 'bg-line'}`} />
        {days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex flex-wrap gap-1.5">
          {r.phone && (
            <Chip>
              Phone app · {r.phone.version === latest ? 'latest' : 'old version'} · {ago(r.phone.lastSeenAt, now)}
            </Chip>
          )}
          {r.browser && <Chip>Browser</Chip>}
          {!r.phone && !r.browser && <span className="text-ink-3">None</span>}
        </div>
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-2">{r.extensionAt ? `Synced ${ago(r.extensionAt, now)}` : <span className="text-ink-3">—</span>}</td>
      <td className="py-2.5 text-right tabular-nums">{r.tasks}</td>
    </tr>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap rounded-full bg-chip px-2 py-0.5 text-[12px] text-ink-2">{children}</span>;
}

/** "5 min ago", "3 h ago", "2 d ago". */
function ago(then: number, now: number): string {
  const m = Math.max(0, Math.round((now - then) / 60_000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`;
}
