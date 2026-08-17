'use client';
// CANONICAL: ZoBeacon sense organ (fail-soft). Law 116: purpose events (signup, activation,
// payment) are written SERVER-SIDE ONLY; this beacon refuses to send them from the client so
// the zoEvent('activation') call in the new-job page can never double-count against the
// server-side write in POST /api/jobs. Pageviews post to NEXT_PUBLIC_ZO_BEACON_URL when the
// platform configures it; with no URL configured this component is a silent no-op.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PURPOSE_EVENTS = new Set(['signup', 'activation', 'payment']);

function post(event: string, path: string): void {
  const url = process.env.NEXT_PUBLIC_ZO_BEACON_URL;
  if (!url) return;
  try {
    const body = JSON.stringify({ product_slug: 'lienclock', event, path });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Beacons never break the page.
  }
}

export function zoEvent(event: string): void {
  if (PURPOSE_EVENTS.has(event)) return; // Law 116: server-side only.
  if (typeof window === 'undefined') return;
  post(event, window.location.pathname);
}

export default function ZoBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) post('pageview', pathname);
  }, [pathname]);
  return null;
}
