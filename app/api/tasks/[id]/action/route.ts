import { actionUser, USER_COOKIE, userFromSession } from '@/lib/auth';
import { getTask, markDone, snooze } from '@/lib/tasks';
import type { NextRequest } from 'next/server';

/**
 * Called by the service worker and the Android app when "Mark done" or "Remind in 2h" is tapped.
 * Authorized by the task's signed token from the notification, or by the student's session cookie.
 */
export async function POST(request: NextRequest, ctx: RouteContext<'/api/tasks/[id]/action'>) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string; token?: string };

  const uid = actionUser(id, body.token) ?? userFromSession(request.cookies.get(USER_COOKIE)?.value);
  if (!uid) return new Response('Unauthorized', { status: 401 });
  if (!(await getTask(uid, id))) return new Response('Not found', { status: 404 });

  if (body.action === 'done') {
    await markDone(uid, id);
    return Response.json({ ok: true });
  }
  if (body.action === 'snooze') {
    const until = await snooze(uid, id);
    return Response.json({ ok: true, snoozedUntil: until.getTime() });
  }
  return new Response('Unknown action', { status: 400 });
}
