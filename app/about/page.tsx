// CANONICAL: public about page for LienClock, server rendered with live state coverage.
import type { Metadata } from 'next';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCoveredStates } from '@/lib/db/state-rules';
import { STATE_NAMES, stateName } from '@/lib/core/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About LienClock',
  description:
    'LienClock turns a job into a dated checklist of preliminary notice, lien filing, and enforcement deadlines, with reminders before each window closes. It never files anything for you.',
};

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

const FEATURE_CARDS = [
  {
    title: 'Calculates every window',
    body: 'Add a job and LienClock builds the full schedule: preliminary notice, notice of intent where a state requires one, lien filing, and enforcement.',
  },
  {
    title: 'Reminds you before it closes',
    body: 'Email reminders arrive at 30, 14, 7, and 1 days out by default, adjustable in settings. SMS reminders are included with Pro.',
  },
  {
    title: 'Shows the statute',
    body: 'Every deadline carries its citation and a plain language note, including where a state can shorten the window.',
  },
];

const STEPS = [
  { title: 'Add a job', body: 'State, general contractor, start date, and the completion date once you have it.' },
  { title: 'Read the schedule', body: 'Every deadline appears instantly with its due date, citation, and note.' },
  { title: 'Get reminded', body: 'Email and SMS nudges arrive before each window closes, on the days you choose.' },
  { title: 'Mark it done', body: 'Check off each notice or filing as you complete it and the reminders stop.' },
];

async function loadCoveredStates(): Promise<string[]> {
  try {
    const supabase = createSupabaseServerClient();
    return await getCoveredStates(supabase);
  } catch {
    return [];
  }
}

export default async function AboutPage() {
  const coveredStates = await loadCoveredStates();

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            LienClock
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={link.href === '/about' ? 'text-slate-900' : 'hover:text-slate-900'}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Get started
            </Link>
          </div>
        </div>
        <nav
          aria-label="Main, mobile"
          className="flex items-center gap-6 border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-600 md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={link.href === '/about' ? 'text-slate-900' : 'hover:text-slate-900'}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pb-4 pt-16 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">About LienClock</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">A deadline clock for your lien rights</h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            LienClock is a deadline tracker for trade subcontractors. Enter the state, the general contractor, and the
            start and completion dates for a job. LienClock calculates every preliminary notice, lien filing, and
            enforcement deadline for that job, shows the statute behind each date, and reminds you before each window
            closes.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            It never files anything on your behalf, and it is not a law firm. It exists so you never miss the window to
            protect your own right to be paid.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Why this exists</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Lien rights are strong leverage for getting paid, and they expire on a schedule. The windows differ by
            state, by anchor date, and sometimes by project type. A sub running four jobs in three states is tracking a
            dozen dates with real money behind each one. Miss a preliminary notice window and the lien right can be
            gone before the invoice is even overdue. LienClock keeps that schedule so you can keep building.
          </p>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight">What LienClock does</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {FEATURE_CARDS.map((card) => (
                <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">What LienClock never does</h2>
          <ul className="mt-6 space-y-4">
            <li className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-slate-900">File documents for you</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                LienClock never serves a notice, records a lien, or starts a lawsuit. Every filing stays in your hands.
              </p>
            </li>
            <li className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-slate-900">Give legal advice</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Dates come from commonly published statutory windows. Some states shorten a window based on recorded
                notices or project type, so read the note on each deadline and talk to a construction attorney when the
                stakes are high.
              </p>
            </li>
          </ul>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">State coverage</h2>
          {coveredStates.length > 0 ? (
            <>
              <p className="mt-4 leading-relaxed text-slate-600">
                LienClock currently tracks statutory windows in {coveredStates.length} states, and new states are added
                to the catalog over time. Every rule carries its citation so you can verify the source.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {coveredStates.map((code) => (
                  <li
                    key={code}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700"
                  >
                    {stateName(code)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 leading-relaxed text-slate-600">
              The coverage list did not load just now. Refresh this page to see the covered states.
            </p>
          )}
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-8 space-y-6">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Protect the next check</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Free tracks one active job with the full deadline engine and email reminders. Pro tracks unlimited jobs and
            adds SMS reminders, priced for a solo operator.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Get started free
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              View pricing
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-md text-sm leading-relaxed text-slate-600">
              LienClock tracks deadlines and sends reminders. It does not file documents and does not provide legal
              advice.
            </p>
            <nav aria-label="Footer" className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
              <Link href="/" className="hover:text-slate-900">Home</Link>
              <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
              <Link href="/about" className="hover:text-slate-900">About</Link>
              <Link href="/login" className="hover:text-slate-900">Sign in</Link>
            </nav>
          </div>
          <p className="mt-8 text-sm text-slate-500">
            <a href="https://zeroorigine.com" className="underline underline-offset-2 hover:text-slate-700">
              Born autonomously at ZeroOrigine
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
