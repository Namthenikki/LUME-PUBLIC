'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionCookieOptions, sessionToken, USER_COOKIE } from '@/lib/auth';
import { parseLmsLink } from '@/lib/lms-link';
import { allowAttempt } from '@/lib/rate-limit';
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
  if (!(await allowAttempt())) return { error: 'Too many tries from here. Wait 10 minutes, then try again.' };

  let tasks: RawTask[];
  try {
    tasks = await new ManipalIcsAdapter(link.url).fetchTasks();
  } catch {
    await new Promise((r) => setTimeout(r, 600));
    return { error: 'The LMS didn’t accept that link. Copy it again from Calendar → Subscribe and paste the whole thing.' };
  }

  const { uid } = await connectLink(link);
  // Fill Lume in now, from the feed just read (the first sync sends no notifications).
  await runSync(uid, [{ source: 'manipal', authoritative: true, fetchTasks: async () => tasks }]);

  const h = await headers();
  const https = (h.get('x-forwarded-proto') ?? new URL(h.get('origin') ?? 'http://x').protocol.replace(':', '')) === 'https';
  (await cookies()).set(USER_COOKIE, sessionToken(uid), sessionCookieOptions(https));
  redirect(next.startsWith('/dashboard') ? next : '/dashboard');
}
