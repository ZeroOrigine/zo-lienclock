// CANONICAL middleware: refreshes the Supabase session and guards protected routes.
// Session refresh is delegated to the canonical updateSession helper in
// lib/supabase/middleware.ts (QA-017: one session-refresh path, no drift).
// PATCH: /api/states and /api/calculate are public read-only catalog endpoints
// (anon-safe RLS, public Cache-Control); they now bypass the auth wall.
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PAGE_PREFIXES = ['/dashboard', '/jobs', '/settings', '/billing', '/account']
const AUTH_PAGES = ['/login', '/signup', '/forgot-password']
const OPEN_API_PREFIXES = [
  '/api/auth',
  '/api/webhooks',
  '/api/cron',
  '/api/plans',
  '/api/states',
  '/api/calculate',
  '/api/health',
]

function startsWithPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cron, webhook style, and public catalog endpoints authenticate themselves; skip session work.
  if (pathname.startsWith('/api') && startsWithPrefix(pathname, OPEN_API_PREFIXES)) {
    return NextResponse.next()
  }

  // Single canonical session-refresh path: delegate cookie/token refresh to
  // lib/supabase/middleware.ts and reuse its response + resolved user here.
  const { response, user } = await updateSession(request)

  if (pathname.startsWith('/api')) {
    if (!user) {
      return NextResponse.json({ data: null, error: 'Sign in to continue.' }, { status: 401 })
    }
    return response
  }

  if (!user && startsWithPrefix(pathname, PROTECTED_PAGE_PREFIXES)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname)
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (user && startsWithPrefix(pathname, AUTH_PAGES)) {
    const nextParam = request.nextUrl.searchParams.get('next')
    const safeTarget =
      nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
        ? nextParam.split('?')[0]
        : '/dashboard'
    const url = request.nextUrl.clone()
    url.pathname = safeTarget
    url.search = ''
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|woff|woff2)$).*)',
  ],
}
