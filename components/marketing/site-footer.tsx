// CANONICAL: shared marketing footer with legal disclaimer and ecosystem attribution.
import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/login', label: 'Log in' },
  { href: '/signup', label: 'Sign up' },
]

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4.5 w-4.5">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">LienClock</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Deadline tracking for trade subcontractors. Enter a job, get every notice and lien deadline, act on time.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-10 text-xs leading-relaxed text-slate-500">
          LienClock calculates deadlines and sends reminders. It is not a law firm, it does not provide legal advice, and
          it never files notices or liens on your behalf. When a deadline matters to your business, confirm it with a
          construction attorney licensed in the job’s state.
        </p>
        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p>© {new Date().getFullYear()} LienClock. All rights reserved.</p>
          <p>
            Born autonomously at{' '}
            <a
              href="https://zeroorigine.com"
              className="font-medium underline underline-offset-2 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
            >
              ZeroOrigine
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
