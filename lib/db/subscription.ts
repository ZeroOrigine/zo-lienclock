// CANONICAL: plan entitlement and usage context for gating (free versus pro limits).
import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_COLUMNS, type JobStatus, type Plan, type SubscriptionStatus } from '@/lib/db/types';

const ENTITLED_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due'];

export interface PlanContext {
  plan_code: string;
  plan_name: string;
  subscription_status: SubscriptionStatus;
  max_active_jobs: number | null;
  sms_reminders_included: boolean;
}

export async function getPlanContext(client: SupabaseClient, userId: string): Promise<PlanContext> {
  const { data: subscription, error: subscriptionError } = await client
    .from('lienclock_subscriptions')
    .select('plan_code, status')
    .eq('user_id', userId)
    .maybeSingle();
  if (subscriptionError) throw subscriptionError;

  const status = (subscription?.status ?? 'active') as SubscriptionStatus;
  const entitled = ENTITLED_STATUSES.includes(status);
  const planCode = entitled ? ((subscription?.plan_code as string | undefined) ?? 'free') : 'free';

  const { data: planRow, error: planError } = await client
    .from('lienclock_plans')
    .select(PLAN_COLUMNS)
    .eq('code', planCode)
    .maybeSingle();
  if (planError) throw planError;

  const plan = (planRow ?? null) as Plan | null;
  if (plan) {
    return {
      plan_code: plan.code,
      plan_name: plan.name,
      subscription_status: status,
      max_active_jobs: plan.max_active_jobs,
      sms_reminders_included: plan.sms_reminders,
    };
  }
  return {
    plan_code: 'free',
    plan_name: 'Free',
    subscription_status: status,
    max_active_jobs: 1,
    sms_reminders_included: false,
  };
}

export async function countJobs(client: SupabaseClient, userId: string, status?: JobStatus): Promise<number> {
  let query = client
    .from('lienclock_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (status) query = query.eq('status', status);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
