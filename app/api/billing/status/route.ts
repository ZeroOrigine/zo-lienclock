// CANONICAL billing status: powers the plan badge, manage-billing button, and job usage meter.
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function json(data: unknown, error: string | null, status = 200) {
  return NextResponse.json({ data, error }, { status })
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return json(null, 'Sign in to continue.', 401)

    const [subRes, jobsRes] = await Promise.all([
      supabase
        .from('lienclock_subscriptions')
        .select('plan_code, status, current_period_end, cancel_at_period_end, stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('lienclock_jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    ])

    if (subRes.error) return json(null, 'We could not load your billing status. Try again in a moment.', 500)

    const planCode = subRes.data?.plan_code ?? 'free'
    const { data: plan } = await supabase
      .from('lienclock_plans')
      .select('code, name, price_cents, billing_interval, max_active_jobs, sms_reminders')
      .eq('code', planCode)
      .maybeSingle()

    const resolvedPlan = plan ?? {
      code: 'free',
      name: 'Free',
      price_cents: 0,
      billing_interval: 'month',
      max_active_jobs: 1,
      sms_reminders: false,
    }
    const activeJobs = jobsRes.count ?? 0
    const maxJobs = resolvedPlan.max_active_jobs ?? null

    return json(
      {
        plan: resolvedPlan,
        subscription: {
          status: subRes.data?.status ?? 'active',
          plan_code: planCode,
          current_period_end: subRes.data?.current_period_end ?? null,
          cancel_at_period_end: subRes.data?.cancel_at_period_end ?? false,
          can_manage_billing: Boolean(subRes.data?.stripe_customer_id),
        },
        usage: {
          active_jobs: activeJobs,
          max_active_jobs: maxJobs,
          can_add_job: maxJobs === null || activeJobs < maxJobs,
        },
      },
      null,
    )
  } catch (error) {
    console.error('[lienclock] billing status error:', error)
    return json(null, 'We could not load your billing status. Try again in a moment.', 500)
  }
}
