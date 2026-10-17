import { type NextRequest, NextResponse } from 'next/server';
import { isStatsKey, sessionCookieOptions, STATS_COOKIE, USER_COOKIE, userFromSession } from './lib/auth';

/** The app pages need a connected Lume; anyone else is sent to the start page to connect their LMS. */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/stats') return statsGate(request);
  if (userFromSession(request.cookies.get(USER_COOKIE)?.value)) return NextResponse.next();
  // Opened by the Android app in a browser with no session: sign in with its one-time code.
  const code = request.nextUrl.searchParams.get('lume_signin');
  if (code) {
    const page = request.nextUrl.clone();
    page.searchParams.delete('lume_signin');
    const signIn = new URL('/api/signin', request.url);
    signIn.searchParams.set('code', code);
    signIn.searchParams.set('next', page.pathname + page.search);
    return NextResponse.redirect(signIn);
  }
  const start = new URL('/start', request.url);
  start.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(start);
}

/** The owner's usage page: `?key=` is swapped for a cookie and dropped from the URL. The page checks the cookie. */
function statsGate(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (key === null) return NextResponse.next();
  const page = request.nextUrl.clone();
  page.search = '';
  const response = NextResponse.redirect(page);
  if (isStatsKey(key)) response.cookies.set(STATS_COOKIE, key, { ...sessionCookieOptions(page.protocol === 'https:'), path: '/stats' });
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/stats'],
};
