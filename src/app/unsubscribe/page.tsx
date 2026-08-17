'use client';

import { useEffect, useState } from 'react';

/**
 * ONE CLICK, and only then a form.
 *
 * Every email now carries the recipient's own token, so arriving here from an
 * email should cost nothing more: the token is honoured on load and the person
 * is told it is done. Asking someone to retype the address we already know is
 * friction on the one action they are entitled to perform without friction.
 *
 * The typed form stays for anyone who arrives here directly, and for the case
 * where a mail client strips the query string.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function UnsubscribePage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('done') === '1') { setState('done'); return; }
    const token = params.get('t') || '';
    if (!UUID.test(token)) return;
    setState('busy');
    fetch(`/api/unsubscribe?t=${encodeURIComponent(token)}`, { method: 'POST' })
      .then((r) => setState(r.ok ? 'done' : 'error'))
      .catch(() => setState('error'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    try {
      const r = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setState(r.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <main className="wrap" style={{ maxWidth: 560, margin: '0 auto', padding: '120px 24px' }}>
      <div className="eyebrow">One click, honoured</div>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 34, marginTop: 12 }}>Unsubscribe</h1>
      {state !== 'done' ? (
        <>
          <p style={{ color: 'var(--dim)', marginTop: 14 }}>
            Enter your email and you will not hear from the machine again.
            No guilt screens, no delays. Every list, not just the one you came from.
          </p>
          <form onSubmit={submit} style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" aria-label="Email address"
              style={{ flex: '1 1 260px', padding: '12px 14px', borderRadius: 10,
                       border: '1px solid var(--line)', background: 'var(--bg2)', color: 'var(--fg)' }}
            />
            <button type="submit" disabled={state === 'busy'}
              style={{ padding: '12px 22px', borderRadius: 10, border: 0,
                       background: 'var(--accent)', color: '#111', fontWeight: 700, cursor: 'pointer' }}>
              {state === 'busy' ? 'Working..' : 'Unsubscribe'}
            </button>
          </form>
          {state === 'error' && (
            <p style={{ color: 'var(--bad, #f87171)', marginTop: 14 }}>Something went wrong. Try again.</p>
          )}
        </>
      ) : (
        <p style={{ color: 'var(--dim)', marginTop: 14 }}>
          Done. You are off every list the machine keeps, not just the one that email
          came from. Nothing further is sent. If you ever want back in, the machine
          keeps the lights on at the homepage.
        </p>
      )}
    </main>
  );
}
