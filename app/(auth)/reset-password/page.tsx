'use client'

// CANONICAL reset-password page: completes the recovery session started by /auth/confirm.
import { useEffect, useState } from 'react'
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

function CheckIcon() {
  return (
    <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

type Phase = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setPhase(data.user ? 'ready' : 'invalid'))
      .catch(() => setPhase('invalid'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Those passwords do not match. Type them again.')
      return
    }
    setLoading(true)
    const supabase = supabaseBrowser()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      const m = updateError.message.toLowerCase()
      setError(
        m.includes('different')
          ? 'Choose a password different from your current one.'
          : 'We could not update your password. Try again in a moment.',
      )
      setLoading(false)
      return
    }
    setPhase('done')
    setTimeout(() => window.location.assign('/dashboard'), 1400)
  }

  if (phase === 'checking') {
    return <div className="h-[360px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
  }

  if (phase === 'invalid') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">This link expired</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Password reset links work once and expire after an hour. Request a fresh one and you are back in.
        </p>
        <div className="mt-6 space-y-3">
          <Link
            href="/forgot-password"
            className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Request a new link
          </Link>
          <Link href="/login" className="block text-sm font-semibold text-blue-700 hover:text-blue-800">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <CheckIcon />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Password updated</h1>
        <p className="mt-2 text-sm text-slate-600">Taking you to your dashboard.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set a new password</h1>
      <p className="mt-1.5 text-sm text-slate-600">Pick something strong. You will use it from now on.</p>

      {error && (
        <div role="alert" aria-live="polite" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Type it once more"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 active:scale-[0.99] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {loading && <Spinner />}
          {loading ? 'Updating password' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
