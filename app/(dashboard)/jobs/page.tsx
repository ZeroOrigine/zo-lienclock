'use client';
// CANONICAL: jobs list with status filters, plan usage, and next-deadline chips.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/core/api';
import { BTN_PRIMARY } from '@/lib/core/ui';
import { DEADLINE_TYPE_LABELS, URGENCY_BADGE, cn, daysRemainingLabel, formatDate, stateName, urgencyFor } from '@/lib/core/format';
import type { Job } from '@/lib/db/types';

interface NextDeadline { id: string; deadline_type: string; due_date: string; is_estimated: boolean; days_remaining: number }
type JobListItem = Job & { next_deadline: NextDeadline | null };
interface Usage { plan_code: string; plan_name: string; max_active_jobs: number | null; active_jobs: number; can_add_job: boolean }
interface JobsPayload { jobs: JobListItem[]; usage: Usage; pagination: { total: number } }

const FILTERS = [
  { value: 'current', label: 'Current' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
] as const;
type FilterValue = (typeof FILTERS)[number]['value'];

export default function JobsPage() {
  const [filter, setFilter] = useState<FilterValue>('current');
  const [reloadKey, setReloadKey] = useState(0);
  const [payload, setPayload] = useState<JobsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void apiGet<JobsPayload>(`/api/jobs?status=${filter}&limit=100`).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.failure) {
        setLoadError(result.failure.message);
        return;
      }
      setPayload(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  const usage = payload?.usage ?? null;
  const jobs = payload?.jobs ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Jobs</h1>
          {usage && (
            <p className="mt-1 text-sm text-slate-600">
              {usage.active_jobs} active {usage.active_jobs === 1 ? 'job' : 'jobs'}
              {usage.max_active_jobs !== null ? ` of ${usage.max_active_jobs} on the ${usage.plan_name} plan` : ` on the ${usage.plan_name} plan`}
            </p>
          )}
        </div>
        <Link href="/jobs/new" className={BTN_PRIMARY}>Add job</Link>
      </header>

      {usage && !usage.can_add_job && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          You are at your active job limit. <Link href="/billing" className="font-semibold underline">Upgrade to Pro</Link> for unlimited jobs, or archive one you finished.
        </div>
      )}

      <div role="group" aria-label="Filter jobs" className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              filter === option.value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{loadError}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className={cn(BTN_PRIMARY, 'mt-4')}>Try again</button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          {filter === 'current' || filter === 'all' ? (
            <>
              <h2 className="font-display text-xl font-bold text-slate-900">No jobs tracked yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">Add a job with its state, GC, and start date. The full deadline timeline appears instantly and reminders are scheduled for you.</p>
              <Link href="/jobs/new" className={cn(BTN_PRIMARY, 'mt-5')}>Add your first job</Link>
            </>
          ) : filter === 'completed' ? (
            <p className="text-sm text-slate-600">No completed jobs yet. Mark a job completed when the work wraps and it will show up here.</p>
          ) : (
            <p className="text-sm text-slate-600">Nothing archived. Archived jobs keep their full history but stop sending reminders.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const chip =
              job.status === 'active'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : job.status === 'completed'
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-slate-100 text-slate-600';
            return (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">{job.name}</p>
                        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium capitalize', chip)}>{job.status}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{stateName(job.state_code)} · GC {job.gc_name} · started {formatDate(job.start_date)}</p>
                    </div>
                    {job.next_deadline ? (
                      <div className="shrink-0 text-left sm:text-right">
                        <span className={cn('inline-block rounded-full border px-2.5 py-1 text-xs font-semibold', URGENCY_BADGE[urgencyFor(job.next_deadline.days_remaining)])}>
                          {daysRemainingLabel(job.next_deadline.days_remaining)}
                        </span>
                        <p className="mt-1 text-xs text-slate-500">{DEADLINE_TYPE_LABELS[job.next_deadline.deadline_type] ?? job.next_deadline.deadline_type} · {formatDate(job.next_deadline.due_date)}</p>
                      </div>
                    ) : job.status !== 'archived' ? (
                      <p className="shrink-0 text-xs text-slate-400">No upcoming deadlines</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
