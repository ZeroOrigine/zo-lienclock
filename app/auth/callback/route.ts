// CANONICAL OAuth and session callback: exchanges the auth code, then routes the user onward.
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

// Law 116: signup is written server side only. Fail-soft: metrics never block a sign in.
async function emitSignup(path: string): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return
    await fetch(`${url}/rest/v1/zo_product_metrics`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ product_slug: 'lienclock', event: 'signup', path }),
      cache: 'no-store',
    })
  } catch {}
}

function isFresh(createdAtIso: string | undefined): boolean {
  const createdAt = createdAtIso ? Date.parse(createdAtIso) : 0
  return Boolean(createdAt) && Date.now() - createdAt < 10 * 60 * 1000
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const providerError = requestUrl.searchParams.get('error') ?? requestUrl.searchParams.get('error_description')
  const next = safeNext(requestUrl.searchParams.get('next'))

  if (providerError) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', requestUrl.origin))
  }

  const supabase = createSupabaseServerClient()

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', requestUrl.origin))
    }
    if (isFresh(data.user?.created_at)) await emitSignup('/auth/callback')
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // No code: instant-confirm signups land here already holding a session.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    if (isFresh(user.created_at)) await emitSignup('/auth/callback')
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  return NextResponse.redirect(new URL('/login?error=session', requestUrl.origin))
}
