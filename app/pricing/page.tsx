// CANONICAL: LienClock pricing page with plan comparison and billing FAQ.
// PATCH: table and FAQ now match the seeded plans (Free, Pro $19/mo, Pro Annual $190/yr)
// and the real 10-state coverage. The fictional Enterprise tier was removed.
import type { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/components/marketing/site-nav'
import SiteFooter from '@/components/marketing/site-footer'
import PricingTiers from '@/components/marketing/pricing-tiers'
import FaqItem from '@/components/marketing/faq-item'

export const metadata: Metadata = {
  title: 'Pricing | LienClock',
  description:
    'Start free with one active job. Pro is $19 a month, or $190 a year with two months free. Every plan covers our ten states with full deadline schedules and reminders.',
  openGraph: {
    title: 'LienClock pricing',
    description: 'A free plan that actually works, and Pro at $19 a month or $190 a year.',
    url: '/pricing',
    siteName: 'LienClock',
    type: 'website',
  },
}

type RowValue = string | boolean

const ROWS: { label: string; free: RowValue; pro: RowValue; annual: RowValue }[] = [
  { label: 'Active jobs', free: '1', pro: 'Unlimited', annual: 'Unlimited' },
  { label: 'State coverage', free: '10 states', pro: '10 states', annual: '10 states' },
  { label: 'Preliminary notice, lien filing, and enforcement dates', free: true, pro: true, annual: true },
  { label: 'Statute citation on every deadline', free: true, pro: true, annual: true },
  { label: 'Deadline dashboard sorted by urgency', free: true, pro: true, annual: true },
  { label: 'Email reminders', free: true, pro: true, annual: true },
  { label: 'Billing', free: 'Free forever', pro: '$19 monthly', annual: '$190 yearly, 2 months free' },
  { label: 'Support', free: 'Email', pro: 'Email', annual: 'Email' },
]

const PRICING_FAQS = [
  {
    q: 'Do I need a credit card to start?',
    a: 'No. The free plan needs an email address and nothing else. Add a card when you decide to upgrade.',
  },
  {
    q: 'What happens when I outgrow the free plan?',
    a: 'Upgrade to Pro from inside the app. Your jobs, deadlines, and reminder settings stay exactly where they are.',
  },
  {
    q: 'Can I change or cancel my plan?',
    a: 'Yes. Change or cancel anytime from billing settings in your account. The free plan stays free.',
  },
  {
    q: 'What does Pro Annual add?',
    a: 'Nothing extra and nothing less: it is the full Pro product billed once a year at $190, which works out to two months free.',
  },
  {
    q: 'What if my state is not covered?',
    a: 'LienClock tells you before you track the job. Coverage today is California, Texas, Florida, New York, Arizona, Washington, Georgia, Nevada, Colorado, and Oregon, and new states are added over time.',
  },
]

export default function PricingPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Priced for one person and a truck.</h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Start free with one active job and the full deadline engine. Upgrade when the work stacks up. Change or
              cancel from billing settings anytime.
            </p>
          </div>
          <div className="mt-12">
            <PricingTiers />
          </div>
        </section>

        <section className="bg-slate-50 py-20 dark:bg-slate-900/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">What each plan includes</h2>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th scope="col" className="px-6 py-4 font-semibold">Feature</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Free</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Pro</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Pro Annual</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <th scope="row" className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{row.label}</th>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300"><Cell value={row.free} /></td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300"><Cell value={row.pro} /></td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300"><Cell value={row.annual} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              Covered today: California, Texas, Florida, New York, Arizona, Washington, Georgia, Nevada, Colorado, and Oregon.
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Pricing questions</h2>
            <div className="mt-10 space-y-3">
              {PRICING_FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-900 py-20 text-white">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Track your first job free.</h2>
            <p className="mt-4 text-lg text-slate-300">Every deadline for the job, calculated in about a minute.</p>
            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-sm transition-colors hover:bg-amber-400"
              >
                Start free
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">No credit card required. Free plan available.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

function Cell({ value }: { value: RowValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="sr-only">Included</span>
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center text-slate-300 dark:text-slate-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden="true">
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
        <span className="sr-only">Not included</span>
      </span>
    )
  }
  return <span>{value}</span>
}
