'use client'
// CANONICAL: shared marketing header for LienClock marketing pages.

import Link from 'next/link'
import { useState } from 'react'

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
]

export default function SiteNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 rounded bg-brand-600 px-3 py-2 text-white">Skip to content</a>
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={close} className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">LienClock</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-sm transition-colors hover:bg-amber-400"
          >
            Get started free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 md:hidden dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="block rounded-md px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <Link
                href="/login"
                onClick={close}
                className="block rounded-md border border-slate-300 px-3 py-3 text-center text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={close}
                className="block rounded-lg bg-amber-500 px-3 py-3 text-center text-base font-semibold text-slate-950 transition-colors hover:bg-amber-400"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
