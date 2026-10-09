import { connection } from 'next/server';
import { HomeView } from '@/components/app/HomeView';
import { reportedAppVersion } from '@/lib/alarm-devices';
import androidRelease from '@/lib/android-release.json';
import { nptelAlert, postsAlert } from '@/lib/source-health';
import { getSyncStatus } from '@/lib/sync';
import { pageUser } from '@/lib/session';
import { listTasks } from '@/lib/tasks';

export default async function HomePage({ searchParams }: PageProps<'/dashboard'>) {
  await connection();
  const { uid } = await pageUser();
  const [{ task }, tasks, nptel, posts, appVersion] = await Promise.all([
    searchParams,
    listTasks(uid),
    getSyncStatus(uid, 'nptel'),
    getSyncStatus(uid, 'manipal-posts'),
    reportedAppVersion(uid),
  ]);
  const now = Date.now();
  return (
    <HomeView
      tasks={tasks}
      renderedAt={now}
      focusId={typeof task === 'string' ? task : null}
      apkReady={androidRelease.origin !== null}
      nptelAlert={nptelAlert(nptel, now)}
      postsAlert={postsAlert(posts, now)}
      appVersion={appVersion}
    />
  );
}
