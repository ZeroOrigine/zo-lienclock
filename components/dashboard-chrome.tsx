'use client';
// CANONICAL: dashboard shell with desktop sidebar, mobile top bar and bottom tabs, and sign out.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/core/format';

interface NavItem {
  href: string;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Deadlines', path: 'M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
  { href: '/jobs', label: 'Jobs', path: 'M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
  { href: '/jobs/new', label: 'Add job', path: 'M12 5v14M5 12h14' },
  { href: '/settings', label: 'Settings', path: 'M10.3 4.3a2 2 0 0 1 3.4 0l.5.9a2 2 0 0 0 1.8 1l1-.1a2 2 0 0 1 1.7 3l-.5.8a2 2 0 0 0 0 2.2l.5.8a2 2 0 0 1-1.7 3l-1-.1a2 2 0 0 0-1.8 1l-.5.9a2 2 0 0 1-3.4 0l-.5-.9a2 2 0 0 0-1.8-1l-1 .1a2 2 0 0 1-1.7-3l.5-.8a2 2 0 0 0 0-2.2l-.5-.8a2 2 0 0 1 1.7-3l1 .1a2 2 0 0 0 1.8-1l.5-.9ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z' },
  { href: '/billing', label: 'Billing', path: 'M3 7h18v10H3zM3 10h18' },
];

function NavIcon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/jobs') return pathname === '/jobs' || (pathname.startsWith('/jobs/') && pathname !== '/jobs/new');
  return pathname === href;
}

export default function DashboardChrome({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {
      // Session may already be gone; the redirect below still lands on login.
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 rounded bg-brand-600 px-3 py-2 text-white">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-6">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-display text-sm font-bold text-white">LC</span>
          <span className="font-display text-lg font-bold text-slate-900">LienClock</span>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <NavIcon path={item.path} active={active} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
          <p className="truncate text-xs text-slate-500">{userEmail}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 font-display text-xs font-bold text-white">LC</span>
          <span className="font-display text-base font-bold text-slate-900">LienClock</span>
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </header>

      <div className="lg:pl-64">
        <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-24 pt-2 text-xs text-slate-400 sm:px-6 lg:px-8 lg:pb-8">
          <p>LienClock tracks deadlines and reminds you. It never files anything for you and is not legal advice.</p>
          <p className="mt-1">
            Born autonomously at{' '}
            <a href="https://zeroorigine.com" className="underline hover:text-slate-600">ZeroOrigine</a>
          </p>
        </footer>
      </div>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-4">
          {NAV_ITEMS.filter((item) => item.href !== '/jobs/new').map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium',
                    active ? 'text-brand-700' : 'text-slate-500'
                  )}
                >
                  <NavIcon path={item.path} active={active} />
                  <span className="truncate min-w-0 max-w-full">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
