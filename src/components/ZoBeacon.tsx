'use client';

import { useEffect } from 'react';

// P3: THE SENSE ORGAN. Every product born from this template reports four
// honest events (page_view, signup, activation, payment) to the ecosystem's
// central zo_product_metrics table, so the Lifecycle and Evolution Minds can
// judge products by HUMANS SERVED instead of health pings. Fire-and-forget,
// fail-silent: a broken beacon must never hurt a page.
function send(event: 'page_view') {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || typeof window === 'undefined') return;
    const slug = (process.env.NEXT_PUBLIC_SITE_URL || window.location.hostname)
      .replace(/^https?:\/\//, '').split('.')[0].slice(0, 40);
    fetch(url + '/rest/v1/zo_product_metrics', {
      method: 'POST',
      headers: {
        apikey: key, Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify({ product_slug: slug, event, path: window.location.pathname.slice(0, 120) }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* senses fail silent */ }
}

// SERVICE events never go through the browser. `send()` above uses the ANON
// key, and a browser-writable `activation` would let anyone forge the number
// that decides whether this product lives. The database enforces this: RLS
// policy `beacon_anon_page_view_only` accepts page_view and nothing else, so a
// client-side activation would be silently REFUSED. It goes server-side.
export function zoEvent(event: 'signup' | 'activation' | 'payment') {
  try {
    if (typeof window === 'undefined') return;
    fetch('/api/zo-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* senses fail silent */ }
}

export default function ZoBeacon() {
  useEffect(() => {
    try {
      const k = 'zo_pv_' + window.location.pathname;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
    } catch { /* private mode etc: count it anyway */ }
    send('page_view');
  }, []);
  return null;
}
