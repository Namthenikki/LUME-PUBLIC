import { createSignInCode, isDeviceToken } from '@/lib/alarm-devices';

/**
 * The Android app asks for a one-time sign-in code while its intro plays, with its paired device
 * token, and opens Lume with it (lib/alarm-devices.ts, "Phone sign-in").
 */
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const code = isDeviceToken(token) ? await createSignInCode(token) : null;
  if (!code) return new Response('Unauthorized', { status: 401 });
  return Response.json({ code }, { headers: { 'cache-control': 'no-store' } });
}
