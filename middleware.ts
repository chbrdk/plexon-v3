import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PATH_LOGIN, PATH_REGISTER, PATH_FORGOT_PASSWORD, PATH_RESET_PASSWORD, PATH_SHARE_REPORTS } from '@/lib/constants';

const authPaths = [PATH_LOGIN, PATH_REGISTER, PATH_FORGOT_PASSWORD, PATH_RESET_PASSWORD];

const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];

function isAuthPath(pathname: string): boolean {
  return authPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isPublicSharePath(pathname: string): boolean {
  return pathname === PATH_SHARE_REPORTS || pathname.startsWith(`${PATH_SHARE_REPORTS}/`);
}

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => req.cookies.has(name));
}

/** Redirect using nextUrl so x-forwarded-host / x-forwarded-proto are respected behind proxy */
function redirectTo(nextUrl: URL, pathname: string) {
  const url = new URL(pathname, nextUrl.origin);
  if (nextUrl.search) url.search = nextUrl.search;
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;
    const hasSession = hasSessionCookie(req);

    if (pathname.startsWith('/api/')) return NextResponse.next();

    if (isPublicSharePath(pathname)) return NextResponse.next();

    if (isAuthPath(pathname)) {
      if (hasSession) return redirectTo(req.nextUrl, '/');
      return NextResponse.next();
    }

    if (!hasSession) {
      return redirectTo(req.nextUrl, PATH_LOGIN);
    }

    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp)$).*)'],
};
