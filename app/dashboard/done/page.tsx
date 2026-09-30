import { connection } from 'next/server';
import { delay, PageHeader } from '@/components/app/PageHeader';
import { SourceChip, TypeChip, Panel } from '@/components/app/ui';
import { UndoButton } from '@/components/app/UndoButton';
import { CheckTile } from '@/components/landing/widgets';
import { pageUser } from '@/lib/session';
import { listTasks } from '@/lib/tasks';
import { dayIST, formatIST } from '@/lib/time';

export const metadata = { title: 'Done · Lume' };

export default async function DonePage() {
  await connection();
  const { uid } = await pageUser();
  const tasks = await listTasks(uid);
  const done = tasks.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt ?? b.dueAt) - (a.doneAt ?? a.dueAt));
  const removed = tasks.filter((t) => t.status === 'cancelled');
  const timed = done.filter((t) => t.doneAt !== null);
  const onTime = timed.filter((t) => t.doneAt! <= t.dueAt).length;

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Done"
        sub={done.length ? `${done.length} finished${timed.length ? `, ${Math.round((onTime / timed.length) * 100)}% on time` : ''}. Nice work.` : 'Finished tasks land here.'}
      />

      {done.length === 0 ? (
        <Panel className="appear">
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckTile />
            <p className="mt-2 font-semibold">Nothing finished yet</p>
            <p className="max-w-[32ch] text-[14px] text-ink-2">Tap the circle next to a task, or Mark done on a reminder.</p>
          </div>
        </Panel>
      ) : (
        <Panel title="Finished" action={<span className="text-[13px] text-ink-3">{done.length}</span>} className="appear">
          <ul>
            {done.map((t, i) => {
              const late = t.doneAt !== null && t.doneAt > t.dueAt;
              return (
                <li key={t.id} className="appear flex items-center gap-3 border-t border-line py-3 first:border-0" style={delay(i)}>
                  <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-green text-white">
                    <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden>
                      <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="truncate text-[13px] text-ink-2">{t.course}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
                      <TypeChip type={t.type} />
                      <SourceChip source={t.source} />
                      {t.doneAt && (
                        <span className={`rounded-full px-2 py-0.5 font-medium ${late ? 'bg-orange/15 text-[#b45309] dark:text-orange' : 'bg-green/12 text-green'}`}>
                          {late ? 'Late' : 'On time'}, {dayIST(t.doneAt)}
                        </span>
                      )}
                    </p>
                  </div>
                  <UndoButton id={t.id} />
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {removed.length > 0 && (
        <details className="appear group rounded-[20px] bg-card shadow-card">
          <summary className="flex h-14 cursor-pointer list-none items-center gap-2 px-5 text-[14px] font-semibold">
            <svg viewBox="0 0 20 20" className="size-4 text-ink-3 transition-transform group-open:rotate-90" aria-hidden>
              <path d="M7.5 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Removed from the LMS
            <span className="font-normal text-ink-3">{removed.length}</span>
          </summary>
          <ul className="px-5 pb-2">
            {removed.map((t) => (
              <li key={t.id} className="border-t border-line py-3">
                <p className="truncate text-[14px] text-ink-2">{t.title}</p>
                <p className="truncate text-[12px] text-ink-3">
                  {t.course}, was due {formatIST(t.dueAt)}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
