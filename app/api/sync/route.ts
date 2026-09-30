import { isCronRequest } from '@/lib/auth';
import { remindIfIdle, syncAllIfIdle } from '@/lib/catch-up';

/** The scheduler's hourly job: every student's LMS feed, then any reminders that came due. */
export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response('Unauthorized', { status: 401 });
  const result = await syncAllIfIdle();
  await remindIfIdle().catch(() => null);
  if (!result) return Response.json({ skipped: 'a sync started less than a minute ago' });
  return Response.json(result);
}
