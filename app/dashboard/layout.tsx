import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import { AppBoot } from '@/components/app/AppBoot';
import { MobileHeader, Sidebar, TabBar } from '@/components/app/Shell';
import { nptelHealth } from '@/lib/source-health';
import { catchUpAfterResponse } from '@/lib/catch-up';
import { upcomingReminders } from '@/lib/stages';
import { getSyncStatus } from '@/lib/sync';
import { pageUser } from '@/lib/session';
import { listTasks } from '@/lib/tasks';
import { touchUser } from '@/lib/users';

export const metadata: Metadata = { title: 'Lume' };

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#f3f3f5',
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await connection(); // always live data, never prerendered at build time
  const { uid, user } = await pageUser();
  catchUpAfterResponse(uid); // opening the app also sends due reminders and refreshes a stale LMS sync
  const [tasks, sync, nptel, jar] = await Promise.all([listTasks(uid), getSyncStatus(uid, 'manipal'), getSyncStatus(uid, 'nptel'), cookies(), touchUser(uid, user)]);
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  const now = Date.now();
  const counts = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    reminders: upcomingReminders(tasks, now).filter((r) => r.at - now < 7 * 86_400_000).length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  return (
    <div data-theme={theme} className="app dots min-h-dvh bg-panel text-ink lg:flex">
      <AppBoot />
      <Sidebar counts={counts} lastSync={sync?.at ?? null} nptel={nptelHealth(nptel, now)} />
      <div className="min-w-0 flex-1">
        <MobileHeader lastSync={sync?.at ?? null} />
        <main className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-9 lg:pb-12 lg:pt-6">{children}</main>
      </div>
      <TabBar counts={counts} />
    </div>
  );
}
