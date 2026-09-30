import Link from 'next/link';
import { connection } from 'next/server';
import { delay, PageHeader } from '@/components/app/PageHeader';
import { Panel } from '@/components/app/ui';
import { STAGE_LABEL, STAGES, STICKY_STAGES, upcomingReminders } from '@/lib/stages';
import { pageUser } from '@/lib/session';
import { listTasks } from '@/lib/tasks';
import { dayIST, istDayNumber, timeIST } from '@/lib/time';

export const metadata = { title: 'Reminders · Lume' };

const URGENT = new Set([...STICKY_STAGES.map((s) => STAGE_LABEL[s as keyof typeof STAGE_LABEL]), STAGE_LABEL.overdue]);

export default async function RemindersPage() {
  await connection();
  const { uid } = await pageUser();
  const tasks = await listTasks(uid);
  const now = Date.now();
  const all = upcomingReminders(tasks, now);
  const today = istDayNumber(now);
  // The next two weeks; further out is just noise.
  const upcoming = all.filter((r) => istDayNumber(r.at) < today + 14);
  const later = all.length - upcoming.length;

  const days = new Map<number, typeof upcoming>();
  for (const r of upcoming) days.set(istDayNumber(r.at), [...(days.get(istDayNumber(r.at)) ?? []), r]);
  const dayLabel = (d: number, at: number) => (d === today ? 'Today' : d === today + 1 ? 'Tomorrow' : dayIST(at));
  let row = 0;

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Reminders"
        sub={
          upcoming.length
            ? `${upcoming.length} reminders in the next two weeks. Marking a task done cancels the rest of its reminders.`
            : later
              ? `Nothing in the next two weeks. ${later} reminders come after that.`
              : 'Nothing scheduled right now.'
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          {upcoming.length === 0 && (
            <Panel>
              <p className="py-8 text-center text-[14px] text-ink-2">When a new deadline appears on the LMS, its reminders show up here.</p>
            </Panel>
          )}
          {[...days].map(([d, list]) => (
            <Panel key={d} title={dayLabel(d, list[0].at)} action={<span className="text-[13px] text-ink-3">{list.length}</span>} className="appear">
              <ul>
                {list.map((r) => (
                  <li key={`${r.taskId}-${r.at}`} className="appear border-t border-line first:border-0" style={delay(row++)}>
                    <Link href={`/dashboard?task=${r.taskId}`} className="-mx-2 flex items-center gap-3 rounded-[12px] px-2 py-3 transition-colors hover:bg-sunken">
                      <span className="w-[72px] shrink-0 text-[14px] font-semibold tabular-nums">{timeIST(r.at)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.title}</span>
                        <span className="block truncate text-[13px] text-ink-2">{r.course}</span>
                        {/* On phones the label sits under the course instead of in a chip */}
                        <span className={`block text-[12px] font-medium min-[420px]:hidden ${URGENT.has(r.label) ? 'text-red' : 'text-[#0a86b3] dark:text-cyan'}`}>{r.label}</span>
                      </span>
                      <span
                        className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium min-[420px]:block ${URGENT.has(r.label) ? 'bg-red/10 text-red' : r.label === 'When the snooze ends' ? 'bg-chip text-ink-2' : 'bg-cyan/15 text-[#0a86b3] dark:text-cyan'}`}
                      >
                        {r.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
          {later > 0 && upcoming.length > 0 && <p className="px-2 text-[13px] text-ink-3">{later} more reminders after these two weeks.</p>}
        </div>

        <Panel title="How reminders work" className="appear lg:sticky lg:top-6">
          <p className="text-[14px] text-ink-2">Every deadline gets these, closer together as it gets near:</p>
          <ol className="relative mt-4 space-y-3 pl-6">
            <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-line" />
            {[['new', 'As soon as it’s on the LMS'] as const, ...STAGES.map((s) => [s, STAGE_LABEL[s]] as const)].map(([stage, label]) => (
              <li key={stage} className="relative text-[14px]">
                <span
                  className={`absolute -left-6 top-[5px] size-[11px] rounded-full border-2 border-card ${stage === 'new' ? 'bg-ink-3' : [...STICKY_STAGES, 'overdue'].includes(stage) ? 'bg-red' : stage === 'dayof' ? 'bg-orange' : 'bg-cyan'}`}
                />
                {label}
                {STICKY_STAGES.includes(stage) && <span className="text-ink-3">, stays on screen</span>}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] text-ink-3">Each reminder has Mark done and Remind in 2h buttons, right on the notification. With the Android app, your phone also rings like an alarm 12 hours, 6 hours, 30 minutes and 10 minutes before. Quiet hours, 12 AM to 8 AM: no alarms, and notifications arrive silently.</p>
        </Panel>
      </div>
    </div>
  );
}
