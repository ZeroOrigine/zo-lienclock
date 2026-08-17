'use client';

import { useState } from 'react';

/**
 * The contact channel. Posts to /api/contact, which writes to
 * zo_contact_messages under a validated anon RLS policy.
 *
 * This exists because hello@zeroorigine.com never worked: zeroorigine.com has
 * no MX record, so every message sent there bounced back to the sender and was
 * never seen here. The privacy page pointed at it for data deletion. The refund
 * page pointed at it for refunds. Neither request could arrive.
 *
 * The `company` field is a honeypot: humans never see it, bots fill it.
 */
const TOPICS: Array<{ value: string; label: string }> = [
  { value: 'general', label: 'Something else' },
  { value: 'privacy', label: 'Delete my data / privacy' },
  { value: 'refund', label: 'Refund' },
  { value: 'genome', label: 'Genome access' },
  { value: 'bug', label: 'Something is broken' },
];

export default function ContactForm({ initialTopic = 'general' }: { initialTopic?: string }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [topic, setTopic] = useState(initialTopic);
  const [company, setCompany] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    if (state === 'sending') return;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
    if (!emailOk) { setError('Please enter an email address we can reply to.'); return; }
    if (message.trim().length < 10) { setError('Tell us a little more, at least 10 characters.'); return; }
    if (message.trim().length > 4000) { setError('That is over 4000 characters. Trim it and send again.'); return; }
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), message: message.trim(), topic, company }),
      });
      const data = await res.json();
      if (data?.ok) { setState('done'); return; }
      setError(data?.error || 'Something went wrong. Try again.');
      setState('idle');
    } catch {
      setError('Something went wrong. Try again.');
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <div
        role="status"
        style={{ marginTop: 22, border: '1px solid var(--alive)', borderRadius: 12, padding: 22, background: 'var(--bg2)', maxWidth: 620 }}
      >
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--alive)' }}>MESSAGE RECEIVED</div>
        <p style={{ color: 'var(--txt)', marginTop: 10, fontSize: 15.5 }}>
          It is in the machine&apos;s queue and a human reads that queue. Privacy and
          refund requests are answered first. If you asked for your data to be
          deleted, that clock has started now, not when someone gets around to it.
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 9, color: 'inherit', fontSize: 15,
  };

  return (
    <div style={{ marginTop: 22, maxWidth: 620 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <select
          value={topic}
          onChange={(e) => { setTopic(e.target.value); setError(''); }}
          aria-label="What is this about"
          style={{ ...inputStyle, appearance: 'auto' }}
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          aria-label="Your email address"
          style={inputStyle}
        />
        <textarea
          placeholder="What do you need?"
          value={message}
          onChange={(e) => { setMessage(e.target.value); setError(''); }}
          aria-label="Your message"
          rows={6}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
        />
        {/* Honeypot: hidden from humans, irresistible to bots. */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0, pointerEvents: 'none' }}
        />
        <button
          onClick={submit}
          disabled={state === 'sending'}
          className="btn gold"
          style={{ border: 'none', cursor: 'pointer', fontSize: 15, padding: '12px 18px' }}
        >
          {state === 'sending' ? 'Sending…' : 'Send to the machine'}
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--dead)', marginTop: 10, fontSize: 14.5 }}>{error}</p>
      )}
      <p style={{ color: 'var(--dim)', marginTop: 12, fontSize: 13.5 }}>
        Your message is stored so it cannot be lost, and your address is used only to
        answer you. Nothing here subscribes you to anything.
      </p>
    </div>
  );
}
