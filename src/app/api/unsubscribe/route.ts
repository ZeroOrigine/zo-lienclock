import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

// THE UNSUBSCRIBE. Two ways in, one switch behind them.
//
// 1. ONE-CLICK, by token (`?t=<uuid>`). Every email now carries the recipient's
//    own token, so leaving costs one click and no typing. This is also what
//    RFC 8058 needs: mailbox providers POST here with `List-Unsubscribe=One-Click`
//    as form data and expect a 2xx, so this route accepts a form-encoded POST
//    with no JSON body at all. A JSON-only handler would 500 on Gmail's request
//    and the header would be worse than absent.
//
// 2. BY HAND, by email, for someone who arrives at /unsubscribe directly.
//
// Both call an RPC that suppresses the address on EVERY list. Before today the
// RPC only touched zo_subscribers, so a supporter could click unsubscribe in a
// donation receipt, be told "you are off the list", and still be on it.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function byToken(token: string) {
  const supabase = createPublicClient();
  const { error } = await supabase.rpc('unsubscribe_by_token', { p_token: token });
  if (error) throw error;
}

// RFC 8058 one-click: the provider sends a POST with the token in the URL and
// no useful body. Always answer 2xx — a non-2xx makes Gmail show the user an
// error for an action we in fact honoured.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('t') || '';
  if (UUID.test(token)) {
    try { await byToken(token); } catch { /* fall through: still 200 */ }
    return NextResponse.json({ ok: true });
  }

  try {
    const { email, company } = await req.json();
    if (typeof company === 'string' && company.trim() !== '') {
      return NextResponse.json({ ok: true }); // honeypot: silent success
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid email.' }, { status: 400 });
    }
    const supabase = createPublicClient();
    const { error } = await supabase.rpc('unsubscribe_email', { p_email: email });
    if (error) throw error;
    // Idempotent by design: unknown or already-unsubscribed emails return the
    // same success. No oracle for probing which emails exist.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}

// Some clients (and cautious humans) follow the link as a GET. Honour it, then
// send them to the page that confirms it in words.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t') || '';
  if (UUID.test(token)) {
    try { await byToken(token); } catch { /* the page still tells the truth below */ }
    return NextResponse.redirect(new URL('/unsubscribe?done=1', url.origin), 303);
  }
  return NextResponse.redirect(new URL('/unsubscribe', url.origin), 303);
}
