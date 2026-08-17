'use client';
// CANONICAL: main dashboard, the cross-job deadline feed with a countdown hero and one-tap mark done.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiSend } from '@/lib/core/api';
import { ToastViewport, useToasts } from '@/lib/core/toast';
import { BTN_PRIMARY } from '@/lib/core/ui';
import { DEADLINE_TYPE_LABELS, URGENCY_BADGE, cn, daysRemainingLabel, formatDate, stateName, urgencyFor } from '@/lib/core/format';

interface FeedJob { id: string; name: string; state_code: string; gc_name: string; status: string }
interface FeedDeadline {
  id: string;
  job_id: string;
  deadline_type: string;
  anchor_event: string;
  due_date: string;
  is_estimated: boolean;
  status: string;
  statute_citation: string | null;
  description: string | null;
  days_remaining: number;
  job: FeedJob | null;
}
interface Usage { plan_code: string; plan_name: string; max_active_jobs: number | null; active_jobs: number; can_add_job: boolean }

export default function DashboardPage() {
  const { toasts, success, error: toastError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deadlines, setDeadlines] = useState<FeedDeadline[]>([]);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [deadlineResult, jobsResult] = await Promise.all([
      apiGet<{ deadlines: FeedDeadline[] }>('/api/deadlines?status=upcoming&limit=100'),
      apiGet<{ usage: Usage; pagination: { total: number } }>('/api/jobs?status=all&limit=1'),
    ]);
    if (deadlineResult.failure) {
      setLoadError(deadlineResult.failure.message);
      setLoading(false);
      return;
    }
    setDeadlines(deadlineResult.data.deadlines);
    if (!jobsResult.failure) {
      setUsage(jobsResult.data.usage);
      setTotalJobs(jobsResult.data.pagination.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markDone(row: FeedDeadline) {
    setBusyId(row.id);
    const result = await apiSend(`/api/deadlines/${row.id}`, 'PATCH', { status: 'completed' });
    setBusyId(null);
    if (result.failure) {
      toastError(result.failure.message);
      return;
    }
    setDeadlines((prev) => prev.filter((item) => item.id !== row.id));
    success(`Done. ${DEADLINE_TYPE_LABELS[row.deadline_type] ?? 'That deadline'} for ${row.job?.name ?? 'this job'} is off your plate.`);
  }

  const groups = useMemo(() => {
    const past: FeedDeadline[] = [];
    const week: FeedDeadline[] = [];
    const month: FeedDeadline[] = [];
    const later: FeedDeadline[] = [];
    for (const row of deadlines) {
      if (row.days_remaining < 0) past.push(row);
      else if (row.days_remaining <= 7) week.push(row);
      else if (row.days_remaining <= 30) month.push(row);
      else later.push(row);
    }
    return [
      { key: 'past', title: 'Past due', items: past },
      { key: 'week', title: 'Next 7 days', items: week },
      { key: 'month', title: 'Next 30 days', items: month },
      { key: 'later', title: 'Later', items: later },
    ].filter((group) => group.items.length > 0);
  }, [deadlines]);

  const next = deadlines[0] ?? null;
  const pastDueCount = deadlines.filter((row) => row.days_remaining < 0).length;
  const weekCount = deadlines.filter((row) => row.days_remaining >= 0 && row.days_remaining <= 7).length;

  if (loading) {
    return (
      <div>
        <p className="sr-only" role="status">Loading your deadlines</p>
        <div className="space-y-4" aria-hidden="true">
          <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{loadError}</p>
        <button type="button" onClick={() => void load()} className={cn(BTN_PRIMARY, 'mt-4')}>Try again</button>
      </div>
    );
  }

  if (totalJobs === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <h1 className="font-display text-3xl font-bold text-slate-900">Protect your right to get paid</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">Enter a job&apos;s state, GC, and start date. LienClock calculates every preliminary notice, lien filing, and enforcement deadline for that state and reminds you before each window closes.</p>
          <ol className="mx-auto mt-8 grid max-w-2xl gap-4 text-left sm:grid-cols-3">
            {[
              { step: 1, title: 'Enter the job', text: 'State, GC, and first day on site. Under a minute.' },
              { step: 2, title: 'See every deadline', text: 'Calculated for that state, with statute citations.' },
              { step: 3, title: 'Get reminded', text: 'Email nudges before each window closes.' },
            ].map((item) => (
              <li key={item.step} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="sr-only">Step {item.step}.</span>
                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{item.step}</span>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.text}</p>
              </li>
            ))}
          </ol>
          <Link href="/jobs/new" className={cn(BTN_PRIMARY, 'mt-8 px-8 py-3')}>Add your first job</Link>
          <p className="mt-4 text-xs text-slate-400">LienClock never files anything for you. It makes sure you never miss the window to act.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Your deadlines</h1>
          <p className="mt-1 text-sm text-slate-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link href="/jobs/new" className={BTN_PRIMARY}>Add job</Link>
      </header>

      {next ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next up</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={cn('font-display text-4xl font-bold', next.days_remaining <= 7 ? 'text-red-600' : next.days_remaining <= 30 ? 'text-amber-600' : 'text-emerald-600')}>
                {next.days_remaining < 0
                  ? `${Math.abs(next.days_remaining)} ${Math.abs(next.days_remaining) === 1 ? 'day' : 'days'} past due`
                  : next.days_remaining === 0
                    ? 'Due today'
                    : `${next.days_remaining} ${next.days_remaining === 1 ? 'day' : 'days'} left`}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{DEADLINE_TYPE_LABELS[next.deadline_type] ?? next.deadline_type}{next.is_estimated ? ' (estimated)' : ''}</p>
              <p className="mt-0.5 text-sm text-slate-600">
                <Link href={`/jobs/${next.job_id}`} className="font-medium text-brand-700 hover:underline">{next.job?.name ?? 'View job'}</Link>
                {next.job ? ` · ${stateName(next.job.state_code)}` : ''} · due {formatDate(next.due_date)}
              </p>
              {next.statute_citation && <p className="mt-1 text-xs text-slate-400">{next.statute_citation}</p>}
            </div>
            <button type="button" onClick={() => void markDone(next)} disabled={busyId === next.id} className={cn(BTN_PRIMARY, 'shrink-0')}>
              {busyId === next.id ? 'Saving...' : 'Mark done'}
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="font-display text-lg font-bold text-emerald-900">All clear for now</h2>
          <p className="mt-1 text-sm text-emerald-800">No upcoming deadlines on your tracked jobs. Add completion dates on active jobs to keep the lien and enforcement clocks accurate.</p>
          <Link href="/jobs" className="mt-3 inline-block text-sm font-semibold text-emerald-900 underline">Review your jobs</Link>
        </section>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className={cn('font-display text-2xl font-bold', pastDueCount > 0 ? 'text-red-600' : 'text-slate-900')}>{pastDueCount}</p>
          <p className="text-xs text-slate-500">Past due</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-display text-2xl font-bold text-slate-900">{weekCount}</p>
          <p className="text-xs text-slate-500">Due in 7 days</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-display text-2xl font-bold text-slate-900">{usage?.active_jobs ?? 0}</p>
          <p className="text-xs text-slate-500">Active jobs</p>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.key} aria-label={group.title}>
          <h2 className={cn('text-sm font-bold uppercase tracking-wide', group.key === 'past' ? 'text-red-600' : 'text-slate-500')}>{group.title}</h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {group.items.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{DEADLINE_TYPE_LABELS[row.deadline_type] ?? row.deadline_type}</p>
                    {row.is_estimated && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500" title="Estimated until you record the actual anchor date on the job.">estimated</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">
                    <Link href={`/jobs/${row.job_id}`} className="font-medium text-brand-700 hover:underline">{row.job?.name ?? 'View job'}</Link>
                    {row.job ? ` · ${stateName(row.job.state_code)} · GC ${row.job.gc_name}` : ''}
                  </p>
                  {row.statute_citation && <p className="mt-0.5 text-xs text-slate-400">{row.statute_citation}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <span className={cn('inline-block rounded-full border px-2.5 py-1 text-xs font-semibold', URGENCY_BADGE[urgencyFor(row.days_remaining)])}>
                      <span className="sr-only">Urgency level. </span>
                      {daysRemainingLabel(row.days_remaining)}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(row.due_date)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void markDone(row)}
                    disabled={busyId === row.id}
                    aria-label={`Mark ${DEADLINE_TYPE_LABELS[row.deadline_type] ?? 'deadline'} for ${row.job?.name ?? 'job'} done`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    {busyId === row.id ? 'Saving...' : 'Mark done'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
