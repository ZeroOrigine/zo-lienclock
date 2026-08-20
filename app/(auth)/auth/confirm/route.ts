// CANONICAL email confirmation handler: verifies Supabase email links, then routes the user onward.
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const OTP_TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change']

function safeNext(raw: string | null, fallback: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}

// Law 116: signup is written server side only. Fail-soft: metrics never block a confirmation.
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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const rawType = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const type = rawType && OTP_TYPES.includes(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null
  const next = safeNext(requestUrl.searchParams.get('next'), type === 'recovery' ? '/reset-password' : '/dashboard')

  const supabase = createSupabaseServerClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      if (type === 'signup' || type === 'email') await emitSignup('/auth/confirm')
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const createdAt = data.user?.created_at ? Date.parse(data.user.created_at) : 0
      if (createdAt && Date.now() - createdAt < 10 * 60 * 1000) await emitSignup('/auth/confirm')
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // #1057: recovery links carry the session in the URL FRAGMENT, which this
  // server route can never see but browsers re-attach across the redirect.
  // Forward recovery traffic to the reset page; the root-layout fragment
  // bridge consumes the hash there.
  const zoRecover = new URL(request.url)
  if (zoRecover.searchParams.get('type') === 'recovery' || (zoRecover.searchParams.get('next') || '').includes('reset-password')) {
    return NextResponse.redirect(new URL('/reset-password', request.url))
  }
  return NextResponse.redirect(new URL('/login?error=confirm_failed', requestUrl.origin))
}
