'use client';
// CANONICAL: plan comparison, checkout kickoff, and billing portal access.
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/core/api';
import { ToastViewport, useToasts } from '@/lib/core/toast';
import { BTN_PRIMARY, BTN_SECONDARY } from '@/lib/core/ui';
import { cn, formatMoney } from '@/lib/core/format';
import type { Plan } from '@/lib/db/types';

interface Usage {
  plan_code: string;
  plan_name: string;
  subscription_status: string;
  max_active_jobs: number | null;
  active_jobs: number;
  sms_reminders_included: boolean;
  can_add_job: boolean;
}

async function postForUrl(path: string, body: unknown): Promise<{ url: string | null; message: string | null }> {
  let response: Response;
  try {
    response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    return { url: null, message: 'We could not reach the server. Check your connection and try again.' };
  }
  const payload = await response.json().catch(() => null);
  const url = (payload?.data?.url ?? payload?.url) as string | undefined;
  if (response.ok && typeof url === 'string') return { url, message: null };
  return { url: null, message: (payload?.error as string | undefined) ?? 'That did not go through. Try again in a moment.' };
}

function planFeatures(plan: Plan): string[] {
  const features = [
    plan.max_active_jobs === null ? 'Unlimited active jobs' : `${plan.max_active_jobs} active ${plan.max_active_jobs === 1 ? 'job' : 'jobs'}`,
    'Every covered state, with statute citations',
    'Email reminders on your schedule',
  ];
  if (plan.sms_reminders) features.push('SMS reminders included');
  return features;
}

export default function BillingClient({ notice }: { notice: 'success' | 'cancel' | null }) {
  const { toasts, error: toastError } = useToasts();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [plansResult, usageResult] = await Promise.all([
        apiGet<{ plans: Plan[] }>('/api/plans'),
        apiGet<{ usage: Usage }>('/api/jobs?status=all&limit=1'),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (plansResult.failure) {
        setLoadError(plansResult.failure.message);
        return;
      }
      setPlans(plansResult.data.plans);
      if (!usageResult.failure) setUsage(usageResult.data.usage);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckout(planCode: string) {
    setBusy(planCode);
    const outcome = await postForUrl('/api/checkout', { plan_code: planCode });
    if (outcome.url) {
      window.location.assign(outcome.url);
      return;
    }
    setBusy(null);
    toastError(outcome.message ?? 'Checkout did not open. Try again in a moment.');
  }

  async function openPortal() {
    setBusy('portal');
    const outcome = await postForUrl('/api/billing/portal', {});
    if (outcome.url) {
      window.location.assign(outcome.url);
      return;
    }
    setBusy(null);
    toastError(outcome.message ?? 'Billing portal did not open. Try again in a moment.');
  }

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} />
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">Simple plans priced for the solo operator. Cancel anytime.</p>
      </header>

      {notice === 'success' && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Payment received. Your new plan is live and its limits apply right away.
        </div>
      )}
      {notice === 'cancel' && (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Checkout was canceled. No charge was made.
        </div>
      )}
      {usage?.subscription_status === 'past_due' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your last payment did not go through. Update your card in Manage billing to keep your plan.
        </div>
      )}

      {loading ? (
        <div className="space-y-4" aria-hidden="true">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className={cn(BTN_PRIMARY, 'mt-4')}>Try again</button>
        </div>
      ) : (
        <>
          {usage && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current plan</p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900">{usage.plan_name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {usage.active_jobs} active {usage.active_jobs === 1 ? 'job' : 'jobs'}
                    {usage.max_active_jobs !== null ? ` of ${usage.max_active_jobs}` : ', no limit'}
                  </p>
                </div>
                {usage.plan_code !== 'free' && (
                  <button type="button" onClick={() => void openPortal()} disabled={busy === 'portal'} className={BTN_SECONDARY}>
                    {busy === 'portal' ? 'Opening...' : 'Manage billing'}
                  </button>
                )}
              </div>
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const current = usage?.plan_code === plan.code;
              const price = plan.price_cents === 0 ? 'Free' : `${formatMoney(plan.price_cents)} / ${plan.billing_interval === 'year' ? 'year' : 'month'}`;
              const highlighted = plan.code === 'pro_monthly';
              return (
                <div key={plan.id} className={cn('flex flex-col rounded-2xl border bg-white p-6 shadow-sm', highlighted ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-200')}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-slate-900">{plan.name}</h2>
                    {current && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Current</span>}
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold text-slate-900">{price}</p>
                  <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                    {planFeatures(plan).map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-0.5 text-emerald-600">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {plan.price_cents > 0 && !current && (
                    <button type="button" onClick={() => void startCheckout(plan.code)} disabled={busy === plan.code} className={cn(BTN_PRIMARY, 'mt-5 w-full')}>
                      {busy === plan.code ? 'Heading to checkout...' : `Get ${plan.name}`}
                    </button>
                  )}
                  {plan.price_cents === 0 && !current && <p className="mt-5 text-xs text-slate-400">Use Manage billing to change plans.</p>}
                  {current && <p className="mt-5 text-center text-xs text-slate-400">You are on this plan.</p>}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">Payments are handled by Stripe. Change or cancel from Manage billing whenever you want.</p>
        </>
      )}
    </div>
  );
}
