'use server';

import { redirect } from 'next/navigation';
import { parseLmsLink } from '@/lib/lms-link';
import { pushToUser } from '@/lib/push';
import { recordFailure, tooManyFailures } from '@/lib/rate-limit';
import { setSessionCookie } from '@/lib/session';
import { ManipalIcsAdapter } from '@/lib/sources/manipal-ics';
import type { RawTask } from '@/lib/sources/types';
import { runSync } from '@/lib/sync';
import { connectLink } from '@/lib/users';

/**
 * Connects a student's LMS: checks the link is a real MUJ calendar link the LMS answers, opens (or
 * creates) their Lume, fills it in, and remembers this browser for a year.
 */
export async function connectAction(_prev: { error: string } | null, form: FormData): Promise<{ error: string }> {
  const link = parseLmsLink(String(form.get('link') ?? ''));
  const next = String(form.get('next') ?? '');
  if ('error' in link) return { error: link.error };
  if (await tooManyFailures()) return { error: 'Too many wrong links from this network. Wait 10 minutes, then try again.' };

  let tasks: RawTask[];
  try {
    tasks = await new ManipalIcsAdapter(link.url).fetchTasks();
  } catch {
    await recordFailure();
    await new Promise((r) => setTimeout(r, 600));
    return { error: 'The LMS didn’t accept that link. Copy it again from Calendar → Subscribe and paste the whole thing.' };
  }

  const { uid, created, gen } = await connectLink(link);
  // Fill Lume in now, from the feed just read (the first sync sends no notifications).
  await runSync(uid, [{ source: 'manipal', authoritative: true, fetchTasks: async () => tasks }]);
  // The link opened an existing Lume on a new device. If a friend got hold of the link, its owner
  // hears about it on their own devices, and can sign everyone else out.
  if (!created) {
    await pushToUser(uid, {
      title: 'Your Lume was opened on another device',
      body: 'Someone pasted your LMS calendar link. If it wasn’t you, open Lume → Settings → Sign out other devices.',
    }).catch(() => null);
  }

  await setSessionCookie(uid, gen);
  redirect(next.startsWith('/dashboard') ? next : '/dashboard');
}
