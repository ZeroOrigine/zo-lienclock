'use client'
// CANONICAL: shared pricing tiers used on / and /pricing.
// PATCH: tiers now mirror the lienclock_plans seeds exactly: Free ($0, 1 active job),
// Pro ($19/month or $190/year, two months free). The previously advertised Enterprise
// plan and team seats do not exist in the product and were removed.

import Link from 'next/link'
import { useState } from 'react'

const FREE_FEATURES = [
  '1 active job at a time',
  '10 covered states, statute citations included',
  'Preliminary notice, lien filing, and enforcement dates',
  'Email reminders before each window closes',
  'Deadline dashboard sorted by urgency',
]

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited active jobs',
  'Every job and state in one countdown',
  'Email support',
]

export default function PricingTiers() {
  const [annual, setAnnual] = useState(false)

  const toggleBase = 'inline-flex min-h-[44px] items-center rounded-full px-5 text-sm transition-colors'
  const toggleOn = 'bg-slate-900 font-semibold text-white dark:bg-white dark:text-slate-900'
  const toggleOff = 'font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div role="group" aria-label="Billing period" className="inline-flex rounded-full border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <button type="button" onClick={() => setAnnual(false)} aria-pressed={!annual} className={`${toggleBase} ${annual ? toggleOff : toggleOn}`}>
            Monthly
          </button>
          <button type="button" onClick={() => setAnnual(true)} aria-pressed={annual} className={`${toggleBase} ${annual ? toggleOn : toggleOff}`}>
            Annual
          </button>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          2 months free on annual
        </span>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Free</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Protect one job, start to finish.</p>
          <div className="mt-5 flex min-h-[56px] items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">$0</span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">free forever</span>
          </div>
          <p className="mt-1 min-h-[20px] text-xs font-semibold text-emerald-600 dark:text-emerald-400"></p>
          <Link
            href="/signup"
            className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Start free
          </Link>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No credit card required.</p>
          <ul className="mt-6 space-y-3">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mt-0.5 h-4 w-4 flex-none text-emerald-600 dark:text-emerald-400" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="relative rounded-2xl border-2 border-amber-500 bg-white p-7 shadow-lg dark:bg-slate-900">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-950">
            Most popular
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">For subs juggling several GCs at once.</p>
          <div className="mt-5 flex min-h-[56px] items-baseline gap-2">
            {annual ? (
              <>
                <span className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">$190</span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/year</span>
              </>
            ) : (
              <>
                <span className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">$19</span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/month</span>
              </>
            )}
          </div>
          <p className="mt-1 min-h-[20px] text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {annual ? 'Two months free: save $38 a year' : ''}
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            Get started
          </Link>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Create a free account, upgrade to Pro in the app.</p>
          <ul className="mt-6 space-y-3">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mt-0.5 h-4 w-4 flex-none text-emerald-600 dark:text-emerald-400" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Covered today: California, Texas, Florida, New York, Arizona, Washington, Georgia, Nevada, Colorado, and Oregon. More states are on the way.
      </p>
    </div>
  )
}
