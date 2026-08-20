// CANONICAL: root layout; self-hosted fonts, metadata, and the ZoBeacon sense organ.
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import ZoBeacon from '@/components/ZoBeacon';
import './globals.css';
import ZoAuthFragmentBridge from '@/components/ZoAuthFragmentBridge'

// #100: a descendant reads URL search params (useSearchParams); opt this
// route out of static generation so `next build` does not CSR-bail.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'LienClock: never miss a lien deadline', template: '%s | LienClock' },
  description:
    'Enter a job with its state, GC, and dates. LienClock calculates every preliminary notice, lien filing, and enforcement deadline, then reminds you before each window closes.',
  openGraph: {
    title: 'LienClock: never miss a lien deadline',
    description:
      'Enter a job with its state, GC, and dates. LienClock calculates every preliminary notice, lien filing, and enforcement deadline, then reminds you before each window closes.',
    url: '/',
    siteName: 'LienClock',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'LienClock' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LienClock: never miss a lien deadline',
    description:
      'Enter a job with its state, GC, and dates. LienClock calculates every preliminary notice, lien filing, and enforcement deadline, then reminds you before each window closes.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'LienClock' }],
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">
        <ZoAuthFragmentBridge />
        {children}
        <ZoBeacon />
      </body>
    </html>
  );
}
