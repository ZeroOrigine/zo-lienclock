// CANONICAL: LienClock marketing landing page. Sections inline; shared chrome imported from components/marketing.
// PATCH: every coverage, price, and plan claim now matches the shipped product exactly:
// 10 covered states (not 50), Free + Pro $19/$190 (no Enterprise), SMS on Pro only.
import type { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/components/marketing/site-nav'
import SiteFooter from '@/components/marketing/site-footer'
import PricingTiers from '@/components/marketing/pricing-tiers'
import FaqItem from '@/components/marketing/faq-item'

export const metadata: Metadata = {
  title: 'LienClock | Lien deadline tracking for subcontractors',
  description:
    'Enter a job\u2019s state, GC, and dates. LienClock calculates every preliminary notice, lien filing, and enforcement deadline across ten covered states, then reminds you before each window closes.',
  keywords: [
    'lien deadline tracker',
    'preliminary notice deadline',
    'mechanics lien calculator',
    'subcontractor lien rights',
    'construction notice deadlines',
  ],
  openGraph: {
    title: 'LienClock: never lose your right to get paid',
    description:
      'Three inputs per job: state, GC, and dates. LienClock returns every notice, lien, and enforcement deadline, with reminders before each window closes.',
    url: '/',
    siteName: 'LienClock',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LienClock: never lose your right to get paid',
    description:
      'Deadline tracking for trade subcontractors in ten covered states. Every notice, lien, and enforcement window, calculated and reminded.',
    images: ['/og.png'],
  },
}

const TRADES = ['Electrical', 'Plumbing', 'HVAC', 'Drywall', 'Concrete', 'Roofing', 'Framing', 'Painting']

const STAKES = [
  {
    stat: '20 days',
    body: 'California\u2019s preliminary notice window, counted from the day you first furnish labor or materials.',
  },
  {
    stat: 'The 15th',
    body: 'Texas monthly notice deadlines land on the 15th, and they keep coming month after month while invoices sit unpaid.',
  },
  {
    stat: '90 days',
    body: 'A common lien filing window measured from completion. Some states give you less, and the count starts whether you noticed or not.',
  },
]

const STEPS = [
  {
    title: 'Add the job',
    body: 'Pick the state, name the GC, enter your start and expected completion dates. It takes about a minute, even from the truck.',
  },
  {
    title: 'Get every deadline',
    body: 'LienClock calculates the preliminary notice, lien filing, and enforcement windows for that job instantly, using that state\u2019s rules.',
  },
  {
    title: 'Act before the window closes',
    body: 'Reminders arrive by email, and by text on Pro, as each deadline approaches. Send your notice, keep your lien rights, get paid.',
  },
]

const SCENARIOS = [
  {
    title: 'The out-of-state job',
    body: 'A drywall crew takes a big contract two states over, where the notice window is a fraction of the one back home. The job goes into LienClock on day one, and the short clock shows up immediately, with time to spare.',
  },
  {
    title: 'The GC that goes quiet',
    body: 'An invoice sits at 60 days and calls stop getting returned. Because the preliminary notice went out on time, the lien window is still open, and the payment conversation changes fast.',
  },
  {
    title: 'Seven jobs, three states',
    body: 'Busy season stacks deadline on deadline. One list sorts them by what closes next, and reminders make sure the busiest week is not the week a window quietly slips shut.',
  },
]

const FAQS = [
  {
    q: 'Does LienClock file liens or send notices for me?',
    a: 'No. LienClock calculates the deadlines and reminds you before each one closes. You send your own notices and record your own lien, or hand the dates to your attorney. Your paperwork stays in your hands.',
  },
  {
    q: 'Which states does it cover?',
    a: 'Ten states today: California, Texas, Florida, New York, Arizona, Washington, Georgia, Nevada, Colorado, and Oregon, with more being added. Every job gets that state\u2019s preliminary notice, lien filing, and enforcement rules applied to your dates, and LienClock tells you up front if a state is not covered yet.',
  },
  {
    q: 'Is the free plan actually useful?',
    a: 'Yes. The free plan runs one active job with the full deadline engine: every covered state, the complete schedule, and email reminders. Finish the job and start tracking the next one, still free.',
  },
  {
    q: 'How do reminders work?',
    a: 'Email reminders are on every plan, and Pro adds SMS text reminders. Each deadline sends reminders as its window approaches, so nothing sneaks up on you.',
  },
  {
    q: 'Is this legal advice?',
    a: 'No. LienClock does the date math and the reminding. It is not a law firm and does not provide legal advice. For questions about your specific situation, talk to a construction attorney licensed in the job\u2019s state.',
  },
  {
    q: 'Is my job data private?',
    a: 'Yes. Your jobs are private to your account. LienClock never contacts your GCs and never shares your job list.',
  },
]

const DOES = [
  'Calculates preliminary notice, lien filing, and enforcement deadlines for every job',
  'Applies the right state\u2019s rules automatically',
  'Reminds you by email, and by SMS on Pro, before each window closes',
  'Sorts every deadline across every job by urgency',
]

const NEVER_DOES = [
  'File a lien or send a notice on your behalf',
  'Contact your GC or anyone on your job',
  'Touch invoices, payments, or your books',
  'Charge per document or per notice',
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'LienClock',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Deadline tracking for trade subcontractors. Enter a job\u2019s state, GC, and dates to get every preliminary notice, lien filing, and enforcement deadline in ten covered states, with reminders before each window closes.',
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Pro', price: '19', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Pro Annual', price: '190', priceCurrency: 'USD' },
  ],
}

export default function LandingPage() {
  return (
    <>
      <style>{`
@media (prefers-reduced-motion: no-preference) {
  .lc-fade { opacity: 0; animation: lcFadeUp .7s ease-out forwards; }
  .lc-d1 { animation-delay: .08s; }
  .lc-d2 { animation-delay: .16s; }
  .lc-d3 { animation-delay: .24s; }
  @keyframes lcFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
}
`}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <SiteNav />
      <main id="main" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-amber-50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
            <div>
              <p className="lc-fade inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                Lien deadline tracking for trade subcontractors
              </p>
              <h1 className="lc-fade lc-d1 mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Never lose your right to get paid.
              </h1>
              <p className="lc-fade lc-d2 mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                Enter three things about a job: the state, the GC, and your dates. LienClock calculates every preliminary
                notice, lien filing, and enforcement deadline, then reminds you by email, and by text on Pro, before each
                window closes.
              </p>
              <div className="lc-fade lc-d3 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-amber-500 px-7 text-base font-semibold text-slate-950 shadow-sm transition-colors hover:bg-amber-400"
                >
                  Start free
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-slate-300 px-7 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  See how it works
                </a>
              </div>
              <p className="lc-fade lc-d3 mt-4 text-sm text-slate-500 dark:text-slate-400">
                Free plan included. No credit card required. First job tracked in about a minute.
              </p>
              <p className="lc-fade lc-d3 mt-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                Made for solo subs and small crews, working jobs across the ten states LienClock covers today.
              </p>
            </div>

            {/* Product mock: an example job schedule */}
            <div className="lc-fade lc-d2 relative">
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-amber-400/30 via-orange-300/20 to-slate-400/20 blur-2xl"
              />
              <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Riverside Clinic Buildout</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Sacramento, CA · Electrical scope</p>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">You enter</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">State: California</span>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">GC: Meridian Builders</span>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Dates: Mar 4 to Aug 22</span>
                  </div>
                </div>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">You get</p>
                <ul className="mt-2 space-y-2.5">
                  <li className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-2.5 w-2.5 flex-none" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Preliminary notice</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Due 20 days from first furnishing</p>
                      </div>
                    </div>
                    <span className="flex-none rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-950">6 days left</span>
                  </li>
                  <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 flex-none rounded-full bg-slate-400" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Lien filing window</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Record within 90 days of completion</p>
                      </div>
                    </div>
                    <span className="flex-none rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">Opens at completion</span>
                  </li>
                  <li className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 flex-none rounded-full bg-emerald-500" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Enforcement deadline</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Calculated from your lien recording date</p>
                      </div>
                    </div>
                    <span className="flex-none rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">On track</span>
                  </li>
                </ul>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 flex-none text-amber-600 dark:text-amber-400" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9a6 6 0 1112 0v4l1.7 2.5a1 1 0 01-.8 1.5H5.1a1 1 0 01-.8-1.5L6 13V9z" />
                    <path strokeLinecap="round" d="M10 20a2 2 0 004 0" />
                  </svg>
                  Reminders armed for this job
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">Example schedule. Yours is calculated from your job’s dates.</p>
            </div>
          </div>
        </section>

        {/* Trades bar */}
        <section className="border-y border-slate-200 bg-slate-50 py-10 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Built for the trades</p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {TRADES.map((trade) => (
                <li key={trade} className="text-sm font-semibold text-slate-400 dark:text-slate-500">{trade}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Stakes */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Miss the window, lose the lien.</h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Lien rights are the leverage that gets subcontractors paid. Every state runs its own clock on them, and the
                clocks do not pause because you were busy building.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STAKES.map((item) => (
                <div key={item.stat} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-4xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{item.stat}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24 bg-slate-50 py-20 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">One job to do: keep you inside your windows.</h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Every feature exists to make a deadline impossible to miss.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard title="Ten states, one engine" icon={<MapIcon />}>
                Preliminary notice, lien filing, and enforcement rules for California, Texas, Florida, New York, Arizona, Washington, Georgia, Nevada, Colorado, and Oregon, applied automatically to each job. More states are on the way.
              </FeatureCard>
              <FeatureCard title="Three inputs, full schedule" icon={<SlidersIcon />}>
                State, GC, start and completion dates. That is the whole setup. Your deadline schedule lands in seconds.
              </FeatureCard>
              <FeatureCard title="Reminders that reach you" icon={<BellIcon />}>
                Email on every plan, SMS on Pro. Each deadline pings you ahead of time, while there is still time to act.
              </FeatureCard>
              <FeatureCard title="One list, sorted by urgency" icon={<ListIcon />}>
                Every deadline across every job and state in one countdown, ordered by what closes next. It reads like a punch list.
              </FeatureCard>
              <FeatureCard title="It never files for you" icon={<ShieldIcon />}>
                LienClock does not send notices, record liens, or contact your GC. It hands you the dates. You keep control of your paperwork.
              </FeatureCard>
              <FeatureCard title="Fast enough for the field" icon={<PhoneIcon />}>
                Add a job from your phone in about a minute, from the truck, between pours, whenever the contract lands.
              </FeatureCard>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From contract to protected in three steps</h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Your first value moment is about a minute away from signup.</p>
            </div>
            <div className="relative mt-14">
              <div aria-hidden="true" className="absolute left-0 top-7 hidden h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent md:block dark:via-slate-700" />
              <ol className="grid gap-10 md:grid-cols-3">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="relative text-center md:px-4">
                    <span aria-hidden="true" className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-xl font-bold text-slate-950 shadow-md">
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-lg font-bold">
                      <span className="sr-only">Step {i + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Scope: what it does and never does */}
        <section className="bg-slate-900 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Deadline tracking. That is the whole product.</h2>
              <p className="mt-4 text-lg text-slate-300">
                No modules to ignore, no suite to learn. One job form, one deadline list, reminders that show up on time.
                Priced for one person and a truck.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-7">
                <h3 className="text-base font-bold uppercase tracking-wide text-amber-400">What LienClock does</h3>
                <ul className="mt-5 space-y-3">
                  {DOES.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-200">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mt-0.5 h-4 w-4 flex-none text-emerald-400" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-7">
                <h3 className="text-base font-bold uppercase tracking-wide text-slate-400">What it never does</h3>
                <ul className="mt-5 space-y-3">
                  {NEVER_DOES.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-200">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 h-4 w-4 flex-none text-slate-500" aria-hidden="true">
                        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-24 bg-slate-50 py-20 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple pricing for one person and a truck</h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                The free plan is not a demo: one active job, the full deadline engine, real reminders. Upgrade when the work stacks up.
              </p>
            </div>
            <div className="mt-12">
              <PricingTiers />
            </div>
            <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-300">
              <Link href="/pricing" className="font-semibold text-amber-700 underline underline-offset-4 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300">
                Compare every plan in detail
              </Link>
            </p>
          </div>
        </section>

        {/* Scenarios */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">The moments LienClock exists for</h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Three ways lien rights slip away on real jobs, and how a running clock changes the ending. These are
                illustrations, not customer stories.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {SCENARIOS.map((s) => (
                <div key={s.title} className="rounded-2xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:border-t-amber-500 dark:bg-slate-900">
                  <h3 className="text-lg font-bold">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 bg-slate-50 py-20 dark:bg-slate-900/40">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
            <div className="mt-10 space-y-3">
              {FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-slate-900 py-20 text-white">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">The clock on your next job is already running.</h2>
            <p className="mt-4 text-lg text-slate-300">
              Add it free, see every deadline in about a minute, and stop wondering whether a window is closing on money
              you already earned.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-sm transition-colors hover:bg-amber-400"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-slate-600 px-8 text-base font-semibold text-slate-200 transition-colors hover:bg-slate-800"
              >
                See pricing
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

function FeatureCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  )
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4.4-3.5-7-7-7-10.2A7 7 0 0112 4a7 7 0 017 6.8C19 14 16.4 17.5 12 21z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" d="M4 7h9m4 0h3M4 12h3m4 0h9M4 17h11m4 0h1" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9a6 6 0 1112 0v4l1.7 2.5a1 1 0 01-.8 1.5H5.1a1 1 0 01-.8-1.5L6 13V9z" />
      <path strokeLinecap="round" d="M10 20a2 2 0 004 0" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9.5-4.1-1.6-7-5.3-7-9.5V6l7-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path strokeLinecap="round" d="M11 18h2" />
    </svg>
  )
}
