import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/play', '/onboarding', '/dashboard', '/admin', '/account'];
const SESSION_COOKIE = 'narintown_session';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/play/:path*',
    '/onboarding/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/account/:path*',
  ],
};
