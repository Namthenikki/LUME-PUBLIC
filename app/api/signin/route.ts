import { type NextRequest, NextResponse } from 'next/server';
import { redeemSignInCode } from '@/lib/alarm-devices';
import { PHONE_COOKIE, sessionCookieOptions, sessionToken, USER_COOKIE } from '@/lib/auth';
import { sessionUser } from '@/lib/session';
import { getUser } from '@/lib/users';

/**
 * Where the proxy sends `?lume_signin=<code>` from the Android app: signs this browser in as the
 * phone's student and goes on to the page. A bad or used code just goes on, to the start page. A
 * browser that is already signed in stays as it is (a code from someone else's phone can't replace it).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = url.searchParams.get('next') ?? '';
  const response = NextResponse.redirect(new URL(next.startsWith('/dashboard') ? next : '/dashboard', url));
  response.headers.set('cache-control', 'no-store');
  if (await sessionUser(request.cookies.get(USER_COOKIE)?.value)) return response;
  const found = await redeemSignInCode(url.searchParams.get('code'));
  const user = found && (await getUser(found.uid));
  if (found && user) {
    const options = sessionCookieOptions(url.protocol === 'https:');
    response.cookies.set(USER_COOKIE, sessionToken(found.uid, user.sessionGen ?? 0), options);
    response.cookies.set(PHONE_COOKIE, found.phone, options);
  }
  return response;
}
