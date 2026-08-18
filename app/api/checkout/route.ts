// CANONICAL checkout: LienClock holds no Stripe key. The central payments service owns the key and the webhook.
// Plans are data, seeded in lienclock_plans and read from the DB (law 109). Never env price ids.
// PATCH: success/cancel now land on /billing, the only page that renders checkout notices.
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

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return json(null, 'Send JSON with a plan_code.', 400)
  }
  const rawPlan =
    typeof body.plan_code === 'string' ? body.plan_code : typeof body.price_id === 'string' ? body.price_id : ''
  const planCode = rawPlan.trim()
  if (!/^[a-z0-9_]{2,50}$/.test(planCode)) return json(null, 'Pick a valid plan to continue.', 400)

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json(null, 'Sign in to upgrade.', 401)

  const { data: plan, error: planError } = await supabase
    .from('lienclock_plans')
    .select('code, name, price_cents, billing_interval, is_active')
    .eq('code', planCode)
    .eq('is_active', true)
    .maybeSingle()
  if (planError) return json(null, 'We could not load that plan. Try again in a moment.', 500)
  if (!plan) return json(null, 'That plan is not available.', 404)
  if (plan.price_cents === 0) return json(null, 'The Free plan needs no checkout. You are on it from day one.', 400)

  const { data: sub } = await supabase
    .from('lienclock_subscriptions')
    .select('plan_code, status, stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const hasActivePaid =
    Boolean(sub?.stripe_subscription_id) && ['active', 'trialing', 'past_due'].includes(sub?.status ?? '')
  if (hasActivePaid) {
    return json(null, 'You already have an active subscription. Use Manage billing to change plans.', 409)
  }

  const paymentsUrl = process.env.PAYMENTS_URL
  const proxyToken = process.env.PAYMENTS_PROXY_TOKEN
  if (!paymentsUrl || !proxyToken) {
    return json(null, 'Payments are briefly offline. Nothing was charged. Try again shortly.', 503)
  }

  const site = siteOrigin(request)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(paymentsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proxyToken}`,
      },
      body: JSON.stringify({
        product_slug: PRODUCT_SLUG,
        price_id: plan.code,
        user_id: user.id,
        user_email: user.email,
        plan_code: plan.code,
        // #240: the plan FACTS. The proxy (checkout v4) turns a recurring plan
        // into a real Stripe price by lookup key; without these, every
        // subscription checkout died at the proxy with "amount_cents required"
        // — the exact failure behind the founder's "payment service is taking
        // a moment" screenshot of 2026-08-18. The row is already loaded above;
        // sending it costs nothing and is the whole difference between a
        // billing page and a decoration.
        amount_cents: plan.price_cents,
        currency: 'usd',
        product_name: `LienClock ${plan.name}`,
        interval: plan.billing_interval,
        metadata: { plan_code: plan.code },
        success_url: `${site}/billing?checkout=success`,
        cancel_url: `${site}/billing?checkout=cancel`,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      return json(null, 'Our payment service is taking a moment. Nothing was charged. Try again shortly.', 502)
    }
    const payload = await res.json().catch(() => null)
    const url = payload && typeof payload.url === 'string' ? payload.url : null
    if (!url || !url.startsWith('https://')) {
      return json(null, 'Checkout could not start. Nothing was charged. Try again shortly.', 502)
    }
    return json({ url }, null, 200)
  } catch {
    return json(null, 'Checkout timed out before it started. Nothing was charged. Try again.', 504)
  } finally {
    clearTimeout(timer)
  }
}
