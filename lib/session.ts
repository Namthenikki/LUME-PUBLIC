import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { USER_COOKIE, userFromSession } from './auth';
import { getUser, type UserDoc } from './users';

/** The student this browser belongs to, from the session cookie (its signature, not the database). */
export async function currentUserId(): Promise<string | null> {
  return userFromSession((await cookies()).get(USER_COOKIE)?.value);
}

/**
 * For server actions: the proxy guards pages, but actions check on their own too, including that the
 * student still exists (their data may have been deleted from another device).
 */
export async function requireUser(): Promise<string> {
  const uid = await currentUserId();
  if (!uid || !(await getUser(uid))) throw new Error('Connect your LMS first');
  return uid;
}

/**
 * For app pages: the student and their record, or off to the start page (e.g. after they deleted
 * their data on another device). Cached per request, so the layout and the page share one read.
 */
export const pageUser = cache(async (): Promise<{ uid: string; user: UserDoc }> => {
  const uid = await currentUserId();
  const user = uid ? await getUser(uid) : null;
  if (!uid || !user) redirect('/start');
  return { uid, user };
});
