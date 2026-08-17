'use client'

// CANONICAL signup page. Google is the only OAuth provider enabled for this project (law 115).
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// #100: a descendant reads URL search params (useSearchParams); opt this
// route out of static generation so `next build` does not CSR-bail.
export const dynamic = 'force-dynamic';

function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

function friendlySignupError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('already registered')) return 'An account with this email already exists. Sign in instead.'
  if (m.includes('password')) return 'Choose a password with at least 8 characters.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many tries in a row. Give it a minute, then try again.'
  return 'We could not create your account. Check your details and try again.'
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
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

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {open ? null : <path d="M4 4l16 16" />}
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

function SignupForm() {
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fullName.trim()) {
      setError('Tell us your name so your reminders sound like they are for you.')
      return
    }
    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }
    setLoading(true)
    const supabase = supabaseBrowser()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        data: { full_name: fullName.trim(), company_name: company.trim() || null },
      },
    })
    if (signUpError) {
      setError(friendlySignupError(signUpError.message))
      setLoading(false)
      return
    }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('An account with this email already exists. Sign in instead.')
      setLoading(false)
      return
    }
    if (data.session) {
      window.location.assign(`/auth/callback?next=${encodeURIComponent(next)}`)
      return
    }
    setSentTo(email.trim())
    setLoading(false)
  }

  async function handleGoogle() {
    setError(null)
    setOauthLoading(true)
    const supabase = supabaseBrowser()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    if (oauthError) {
      setError('Google sign in did not start. Try again in a moment.')
      setOauthLoading(false)
    }
  }

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <MailIcon />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Confirm your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          We sent a confirmation link to <span className="font-semibold text-slate-900">{sentTo}</span>. Open it and your
          account goes live. Check spam if it is not there within a minute.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-6 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          Use a different email
        </button>
        <p className="mt-4 text-sm text-slate-600">
          Already confirmed?{' '}
          <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
      <p className="mt-1.5 text-sm text-slate-600">
        Enter a job's state and dates. LienClock calculates every notice and lien deadline, then reminds you before each
        window closes.
      </p>

      {error && (
        <div role="alert" aria-live="polite" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={oauthLoading || loading}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {oauthLoading ? <Spinner /> : <GoogleIcon />}
        Continue with Google
      </button>

      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
            Your name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
            placeholder="Sam Rivera"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-slate-700">
            Company <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="organization"
            placeholder="Rivera Electric LLC"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-11 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">At least 8 characters.</p>
        </div>

        <button
          type="submit"
          disabled={loading || oauthLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 active:scale-[0.99] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {loading && <Spinner />}
          {loading ? 'Creating your account' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        By creating an account you agree that LienClock is a reminder tool, not a law firm, and never files documents for
        you.
      </p>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-[640px] animate-pulse rounded-2xl border border-slate-200 bg-white" />}>
      <SignupForm />
    </Suspense>
  )
}
