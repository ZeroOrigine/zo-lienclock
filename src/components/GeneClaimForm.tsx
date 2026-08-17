'use client';

import { useState } from 'react';

/**
 * Genome access claim. A supporter enters the email they donated with plus
 * their GitHub username; the machine verifies against the donation ledger and
 * sends a read-only invite to ZeroOrigine/zo-genes. Posts to /api/gene-access.
 * The `company` field is a honeypot: humans never see it, bots fill it.
 */
export default function GeneClaimForm() {
  const [email, setEmail] = useState('');
  const [github, setGithub] = useState('');
  const [company, setCompany] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    if (state === 'sending') return;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
    const githubOk = /^[A-Za-z0-9-]{1,39}$/.test(github.trim());
    if (!emailOk) { setError('Please enter the email you supported with.'); return; }
    if (!githubOk) { setError('Please enter a valid GitHub username, letters, numbers and hyphens only.'); return; }
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/gene-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), github: github.trim(), company }),
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
        style={{ marginTop: 22, border: '1px solid var(--alive)', borderRadius: 12, padding: 22, background: 'var(--bg2)', maxWidth: 560 }}
      >
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--alive)' }}>CLAIM RECORDED</div>
        <p style={{ color: 'var(--txt)', marginTop: 10, fontSize: 15.5 }}>
          The machine processes claims within the hour and emails you the outcome either
          way: your GitHub invite, a confirmation if your account already has access, or
          what to fix if the email does not match a donation on record.
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 9, color: 'inherit', fontSize: 15,
  };

  return (
    <div style={{ marginTop: 22, maxWidth: 560 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <input
          type="email"
          placeholder="Email you supported with"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          aria-label="The email address you supported with"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="GitHub username"
          value={github}
          onChange={(e) => { setGithub(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          aria-label="Your GitHub username"
          style={inputStyle}
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
          {state === 'sending' ? 'Recording your claim…' : 'Claim genome access'}
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--dead)', marginTop: 10, fontSize: 14.5 }}>{error}</p>
      )}
      <p style={{ color: 'var(--dim)', marginTop: 12, fontSize: 13.5 }}>
        Read-only access to the private gene library. Your email is used once, to match
        your donation. Nothing else happens to it.
      </p>
    </div>
  );
}
