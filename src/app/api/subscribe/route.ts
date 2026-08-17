import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, company } = await req.json();
    // Honeypot: a real browser leaves `company` empty. If it is filled, a bot did it.
    // Silently succeed and write nothing (do not tell the bot it was caught).
    // NOTE: Cloudflare Turnstile verification would slot in here (verify token server-side)
    // once the founder provisions the Turnstile secret key.
    if (typeof company === 'string' && company.trim() !== '') {
      return NextResponse.json({ ok: true });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid email.' }, { status: 400 });
    }
    const supabase = createPublicClient();
    // Anon INSERT via a validated RLS policy (no service role). A duplicate email
    // (23505) means already subscribed, idempotent success, not an error. We keep
    // anon to INSERT-only, so no UPDATE surface is opened.
    const addr = email.toLowerCase().trim();
    const { error } = await supabase
      .from('zo_subscribers')
      .insert({ email: addr, source: 'website' });
    if (error && error.code !== '23505') throw error;
    // 23505 means the address is already a row — which INCLUDES anyone who
    // previously unsubscribed. The old code swallowed that as success and left
    // unsubscribed_at set: the person asked to rejoin, was told yes, and would
    // never have heard anything again. Consent is restored explicitly.
    if (error?.code === '23505') {
      const { error: reErr } = await supabase.rpc('resubscribe_email', { p_email: addr });
      if (reErr) throw reErr;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
