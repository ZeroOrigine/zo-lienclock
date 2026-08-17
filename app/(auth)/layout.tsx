// CANONICAL auth shell: centered card layout for every LienClock auth page.
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="h-1 w-full bg-blue-700" aria-hidden="true" />
      <header className="mx-auto w-full max-w-md px-4 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 shadow-sm" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">LienClock</span>
        </Link>
        <p className="mt-2 text-sm text-slate-500">
          Every notice and lien deadline, calculated and tracked. You keep your right to be paid.
        </p>
      </header>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg">
        Skip to content
      </a>
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-8">{children}</main>
      <footer className="mx-auto w-full max-w-md px-4 pb-8">
        <p className="text-xs leading-relaxed text-slate-400">
          LienClock calculates deadlines and sends reminders. It never files documents for you and it is not legal advice.
        </p>
      </footer>
    </div>
  )
}
