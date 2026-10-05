import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Keep middleware edge-safe: no heavy `@/lib/constants` imports (breaks public path gates). */
const PATH_LOGIN = '/login'
const PATH_REGISTER = '/register'
const PATH_FORGOT_PASSWORD = '/forgot-password'
const PATH_RESET_PASSWORD = '/reset-password'
const PATH_SHARE_REPORTS = '/share/reports'
const PATH_SHARE_QUICK_CHECK = '/share/quick-check'
const PATH_SHARE_METRON = '/share/metron'
const PATH_DOCS_PUBLIC = '/docs'
const PATH_SUITE_LANDING = '/suite'
const PATH_AGENCY_DEMO = '/agency'

const authPaths = [PATH_LOGIN, PATH_REGISTER, PATH_FORGOT_PASSWORD, PATH_RESET_PASSWORD]

const PUBLIC_STANDALONE = new Set([
  PATH_SUITE_LANDING,
  PATH_AGENCY_DEMO,
  '/lindenau.html',
  '/kernwerk.html',
  '/kernwerk-classic.html',
  '/kernwerk-natural.html',
  '/louder.html',
  '/caro.html',
])

const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token']

function isAuthPath(pathname: string): boolean {
  return authPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isPublicSharePath(pathname: string): boolean {
  return (
    pathname === PATH_SHARE_REPORTS ||
    pathname.startsWith(`${PATH_SHARE_REPORTS}/`) ||
    pathname === PATH_SHARE_QUICK_CHECK ||
    pathname.startsWith(`${PATH_SHARE_QUICK_CHECK}/`) ||
    pathname === PATH_SHARE_METRON ||
    pathname.startsWith(`${PATH_SHARE_METRON}/`)
  )
}

function isPublicDocsPath(pathname: string): boolean {
  return pathname === PATH_DOCS_PUBLIC || pathname.startsWith(`${PATH_DOCS_PUBLIC}/`)
}

function isPublicStandalonePath(pathname: string): boolean {
  return PUBLIC_STANDALONE.has(pathname) || isPublicDocsPath(pathname)
}

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => req.cookies.has(name))
}

/** Redirect using nextUrl so x-forwarded-host / x-forwarded-proto are respected behind proxy */
function redirectTo(nextUrl: URL, pathname: string) {
  const url = new URL(pathname, nextUrl.origin)
  if (nextUrl.search) url.search = nextUrl.search
  return NextResponse.redirect(url)
}

export function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl
    const hasSession = hasSessionCookie(req)

    if (pathname.startsWith('/api/')) return NextResponse.next()

    if (isPublicSharePath(pathname)) return NextResponse.next()

    if (isPublicDocsPath(pathname)) return NextResponse.next()

    if (isPublicStandalonePath(pathname)) return NextResponse.next()

    if (isAuthPath(pathname)) {
      if (hasSession) return redirectTo(req.nextUrl, '/')
      return NextResponse.next()
    }

    if (!hasSession) {
      return redirectTo(req.nextUrl, PATH_LOGIN)
    }

    return NextResponse.next()
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp)$).*)'],
}
