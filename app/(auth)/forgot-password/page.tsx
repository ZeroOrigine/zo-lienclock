'use client'

// CANONICAL forgot-password page: sends a Supabase recovery link that lands on /auth/confirm.
import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Enter your account email.')
      return
    }
    setLoading(true)
    const supabase = supabaseBrowser()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    })
    if (resetError) {
      const m = resetError.message.toLowerCase()
      setError(
        m.includes('rate limit') || m.includes('too many')
          ? 'Too many tries in a row. Give it a minute, then try again.'
          : 'We could not send the link. Check the address and try again.',
      )
      setLoading(false)
      return
    }
    setSentTo(email.trim())
    setLoading(false)
  }

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <MailIcon />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Check your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          If an account exists for <span className="font-semibold text-slate-900">{sentTo}</span>, a password reset link
          is on the way. It works once and expires after an hour.
        </p>
        <p className="mt-6 text-sm text-slate-600">
          Remembered it?{' '}
          <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reset your password</h1>
      <p className="mt-1.5 text-sm text-slate-600">
        Enter your account email. We will send a link that lets you set a new password.
      </p>

      {error && (
        <div role="alert" aria-live="polite" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@yourcompany.com"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 active:scale-[0.99] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {loading && <Spinner />}
          {loading ? 'Sending link' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
