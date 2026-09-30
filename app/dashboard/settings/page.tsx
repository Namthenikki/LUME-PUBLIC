import { cookies, headers } from 'next/headers';
import { connection } from 'next/server';
import { LmsSource, YourDataCard } from '@/components/app/AccountCards';
import { AndroidCard } from '@/components/app/AndroidCard';
import { NptelSource } from '@/components/app/NptelSource';
import { PageHeader } from '@/components/app/PageHeader';
import { AppearanceCard, InstallCard, NotificationsCard } from '@/components/app/SettingsCards';
import { SyncButton } from '@/components/app/SyncButton';
import { Panel } from '@/components/app/ui';
import { listAlarmDevices } from '@/lib/alarm-devices';
import androidRelease from '@/lib/android-release.json';
import { nptelKey } from '@/lib/auth';
import { lastReminderCheck } from '@/lib/catch-up';
import { countDevices } from '@/lib/push';
import { pageUser } from '@/lib/session';
import { nptelHealth } from '@/lib/source-health';
import { getSyncStatus } from '@/lib/sync';
import { formatIST } from '@/lib/time';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

export const metadata = { title: 'Settings · Lume' };

export default async function SettingsPage() {
  await connection();
  const { uid } = await pageUser();
  const [devices, lastCheck, sync, nptel, jar, head, phones] = await Promise.all([
    countDevices(uid),
    lastReminderCheck(),
    getSyncStatus(uid, 'manipal'),
    getSyncStatus(uid, 'nptel'),
    cookies(),
    headers(),
    listAlarmDevices(uid),
  ]);
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  // The extension's connection code: this app's address and the student's NPTEL key, pasted in one go.
  const origin = `${head.get('x-forwarded-proto') ?? 'http'}://${head.get('host')}`;

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader title="Settings" sub="Notifications, the app, and where Lume looks for deadlines." />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="appear space-y-4">
          <NotificationsCard devices={devices} lastCheck={lastCheck} />
          <AndroidCard phones={phones} apkReady={androidRelease.origin !== null} />
          <AppearanceCard theme={theme} />
          <InstallCard />
        </div>

        <div className="appear space-y-4" style={{ animationDelay: '80ms' }}>
          <Panel title="Sources" action={<SyncButton variant="icon" />}>
            <ul>
              <LmsSource
                ok={sync ? sync.ok : null}
                detail={sync ? `Last checked ${formatIST(sync.at)}. ${sync.ok ? `${sync.message}.` : 'The LMS didn’t accept your link.'}` : 'Not checked yet.'}
              />
              <NptelSource health={nptelHealth(nptel, Date.now())} at={nptel?.at ?? null} message={nptel?.message ?? null} code={`${origin}#${nptelKey(uid)}`} />
            </ul>
          </Panel>

          <YourDataCard />
        </div>
      </div>
    </div>
  );
}
