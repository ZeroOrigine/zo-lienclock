// CANONICAL billing portal: proxies to the central payments portal (law 186). No Stripe SDK in this product.
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { rateLimitCheck, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = 'lienclock'

function json(data: unknown, error: string | null, status = 200) {
  return NextResponse.json({ data, error }, { status })
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const hosts = new Set<string>()
  try {
    hosts.add(new URL(request.url).host)
  } catch {}
  for (const raw of [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (raw) {
      try {
        hosts.add(new URL(raw).host)
      } catch {}
    }
  }
  try {
    return hosts.has(new URL(origin).host)
  } catch {
    return false
  }
}

function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/+$/, '')
  return new URL(request.url).origin
}

export async function POST(request: Request) {
  const verdict = await rateLimitCheck('lienclock_billing', clientIp(request), 20, 1000)
  if (!verdict.allowed) {
    return NextResponse.json(
      { data: null, error: 'Too many requests for today. The counter resets tomorrow.' },
      { status: 429 },
    )
  }

  if (!sameOrigin(request)) return json(null, 'Request blocked.', 403)

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json(null, 'Sign in to manage billing.', 401)

  // The Stripe customer id lives on lienclock_subscriptions; the central webhook writes it there.
  const { data: sub, error: subError } = await supabase
    .from('lienclock_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (subError) return json(null, 'We could not load your billing profile. Try again in a moment.', 500)
  if (!sub?.stripe_customer_id) {
    return json(null, 'No billing profile yet. Upgrade to Pro first and this unlocks.', 400)
  }

  const portalUrl = process.env.PAYMENTS_PORTAL_URL
  const proxyToken = process.env.PAYMENTS_PROXY_TOKEN
  if (!portalUrl || !proxyToken) {
    return json(null, 'Billing management is briefly offline. Try again shortly.', 503)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(portalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proxyToken}`,
      },
      body: JSON.stringify({
        product_slug: PRODUCT_SLUG,
        customer_id: sub.stripe_customer_id,
        return_url: `${siteOrigin(request)}/billing`,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      return json(null, 'The billing portal is taking a moment. Try again shortly.', 502)
    }
    const payload = await res.json().catch(() => null)
    const url = payload && typeof payload.url === 'string' ? payload.url : null
    if (!url || !url.startsWith('https://')) {
      return json(null, 'The billing portal could not open. Try again shortly.', 502)
    }
    return json({ url }, null, 200)
  } catch {
    return json(null, 'The billing portal timed out. Try again.', 504)
  } finally {
    clearTimeout(timer)
  }
}
