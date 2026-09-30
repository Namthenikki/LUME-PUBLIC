import { type NextRequest, NextResponse } from 'next/server';
import { USER_COOKIE, userFromSession } from './lib/auth';

/** The app pages need a connected Lume; anyone else is sent to the start page to connect their LMS. */
export function proxy(request: NextRequest) {
  if (userFromSession(request.cookies.get(USER_COOKIE)?.value)) return NextResponse.next();
  const start = new URL('/start', request.url);
  start.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(start);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
