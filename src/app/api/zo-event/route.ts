import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// THE SERVICE HALF OF THE BEACON (law #116).
//
// `served_lifetime` decides whether a product lives. If a browser could write
// `activation`, that number would be forgeable by anyone holding the anon key,
// which ships in every client bundle. So the split is enforced by the database:
//   page_view                  browser, anon key, changes NO verdict
//   signup/activation/payment  HERE, service role, server-side only
// The RLS policy `beacon_anon_page_view_only` blocks the browser from the rest,
// so this route is not a convenience: it is the ONLY way a service event lands.
//
// Fail-soft by law: a metrics failure must never break a user's request.
const SERVICE_EVENTS = new Set(['signup', 'activation', 'payment']);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const event = String((body as Record<string, unknown>).event || '');
    if (!SERVICE_EVENTS.has(event)) {
      // page_view belongs to the browser; anything else is not a beacon event.
      return NextResponse.json({ ok: false, reason: 'event_not_allowed_here' }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ ok: false, reason: 'not_configured' });

    const slug = (process.env.NEXT_PUBLIC_SITE_URL || '')
      .replace(/^https?:\/\//, '').split('.')[0].slice(0, 40);
    if (!slug) return NextResponse.json({ ok: false, reason: 'no_slug' });

    // A route, never a URL with query parameters: no tokens, no PII.
    const clean = String((body as Record<string, unknown>).path || '/').split('?')[0].slice(0, 120);
    await createClient(url, key).from('zo_product_metrics')
      .insert({ product_slug: slug, event, path: clean });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, noted: false });   // never break the caller
  }
}
