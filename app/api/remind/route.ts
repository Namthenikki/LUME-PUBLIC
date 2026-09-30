import { isCronRequest } from '@/lib/auth';
import { remindIfIdle } from '@/lib/catch-up';

export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response('Unauthorized', { status: 401 });
  // null: another caller checked less than a minute ago.
  return Response.json((await remindIfIdle()) ?? { skipped: 'checked less than a minute ago' });
}
