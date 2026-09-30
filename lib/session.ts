import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { parseSession, sessionCookieOptions, sessionToken, USER_COOKIE } from './auth';
import { getUser, type UserDoc } from './users';

/**
 * The student a session cookie opens: a valid signature, a student who still exists, and the current
 * sign-in generation (older cookies were signed out from another device, or by a link change).
 */
export async function sessionUser(value: string | undefined): Promise<{ uid: string; user: UserDoc } | null> {
  const session = parseSession(value);
  if (!session) return null;
  const user = await getUser(session.uid);
  return user && (user.sessionGen ?? 0) === session.gen ? { uid: session.uid, user } : null;
}

/** The student this browser belongs to, or null. */
export async function currentUserId(): Promise<string | null> {
  return (await sessionUser((await cookies()).get(USER_COOKIE)?.value))?.uid ?? null;
}

/** For server actions: the proxy guards pages, but actions check on their own too, against the database. */
export async function requireUser(): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error('Connect your LMS first');
  return uid;
}

/**
 * For app pages: the student and their record, or off to the start page (they deleted their data,
 * or this device was signed out from another one). Cached per request, so the layout and the page
 * share one read.
 */
export const pageUser = cache(async (): Promise<{ uid: string; user: UserDoc }> => {
  const found = await sessionUser((await cookies()).get(USER_COOKIE)?.value);
  if (!found) redirect('/start');
  return found;
});

/** Remembers this browser as the student's, for a year. */
export async function setSessionCookie(uid: string, gen: number): Promise<void> {
  const h = await headers();
  const https = (h.get('x-forwarded-proto') ?? new URL(h.get('origin') ?? 'http://x').protocol.replace(':', '')) === 'https';
  (await cookies()).set(USER_COOKIE, sessionToken(uid, gen), sessionCookieOptions(https));
}
