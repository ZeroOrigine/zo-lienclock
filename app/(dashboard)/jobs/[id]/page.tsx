'use client';
// CANONICAL: job detail with the deadline timeline, key date capture, status controls, and edit.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiGet, apiSend } from '@/lib/core/api';
import { ToastViewport, useToasts } from '@/lib/core/toast';
import { BTN_PRIMARY, BTN_SECONDARY, FieldError, INPUT_CLASS, LABEL_CLASS } from '@/lib/core/ui';
import { ANCHOR_LABELS, DEADLINE_TYPE_LABELS, URGENCY_BADGE, cn, daysRemainingLabel, formatDate, formatMoney, stateName, urgencyFor } from '@/lib/core/format';
import type { Deadline, Job } from '@/lib/db/types';

type DeadlineRow = Deadline & { days_remaining: number };
interface JobPayload { job: Job; deadlines: DeadlineRow[] }

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { toasts, success, error: toastError } = useToasts();
  const [job, setJob] = useState<Job | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [completionInput, setCompletionInput] = useState('');
  const [lienInput, setLienInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ state_code: '', name: '', gc_name: '', owner_name: '', property_address: '', start_date: '', contract_amount: '', notes: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [stateOptions, setStateOptions] = useState<{ code: string; name: string }[]>([]);

  const applyPayload = useCallback((payload: JobPayload) => {
    setJob(payload.job);
    setDeadlines(payload.deadlines);
    setCompletionInput(payload.job.completion_date ?? '');
    setLienInput(payload.job.lien_filed_date ?? '');
    setEdit({
      state_code: payload.job.state_code,
      name: payload.job.name,
      gc_name: payload.job.gc_name,
      owner_name: payload.job.owner_name ?? '',
      property_address: payload.job.property_address ?? '',
      start_date: payload.job.start_date,
      contract_amount: payload.job.contract_amount === null ? '' : String(payload.job.contract_amount),
      notes: payload.job.notes ?? '',
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await apiGet<JobPayload>(`/api/jobs/${params.id}`);
    setLoading(false);
    if (result.failure) {
      setLoadError(result.failure.message);
      return;
    }
    applyPayload(result.data);
  }, [params.id, applyPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await apiGet<{ states?: { code?: string; state_code?: string; name?: string; state_name?: string }[] }>('/api/states');
      if (result.failure || cancelled) return;
      const rows = Array.isArray(result.data.states) ? result.data.states : [];
      const options: { code: string; name: string }[] = [];
      for (const row of rows) {
        const code = typeof row.code === 'string' ? row.code : typeof row.state_code === 'string' ? row.state_code : '';
        if (!code) continue;
        const name = typeof row.name === 'string' ? row.name : typeof row.state_name === 'string' ? row.state_name : stateName(code);
        options.push({ code, name });
      }
      if (options.length > 0) setStateOptions(options);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchJob = useCallback(
    async (fields: Record<string, unknown>, actionKey: string, message: string) => {
      setBusy(actionKey);
      const result = await apiSend<JobPayload>(`/api/jobs/${params.id}`, 'PATCH', fields);
      setBusy(null);
      if (result.failure) {
        toastError(result.failure.message);
        if (result.failure.details) setEditErrors(result.failure.details);
        return false;
      }
      setEditErrors({});
      applyPayload(result.data);
      success(message);
      return true;
    },
    [params.id, applyPayload, success, toastError]
  );

  async function setDeadlineStatus(row: DeadlineRow, status: 'completed' | 'upcoming') {
    setBusy(`deadline-${row.id}`);
    const result = await apiSend<{ deadline: DeadlineRow }>(`/api/deadlines/${row.id}`, 'PATCH', { status });
    setBusy(null);
    if (result.failure) {
      toastError(result.failure.message);
      return;
    }
    setDeadlines((prev) => prev.map((item) => (item.id === row.id ? result.data.deadline : item)));
    success(status === 'completed' ? `${DEADLINE_TYPE_LABELS[row.deadline_type] ?? 'Deadline'} marked done.` : 'Back on the clock. Reminders are rescheduled.');
  }

  async function archiveJob() {
    if (!window.confirm('Archive this job? Reminders stop and it moves out of your active list. You can restore it later.')) return;
    setBusy('archive');
    const result = await apiSend<{ job: Job }>(`/api/jobs/${params.id}`, 'DELETE');
    setBusy(null);
    if (result.failure) {
      toastError(result.failure.message);
      return;
    }
    success('Job archived. Its history stays saved.');
    void load();
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit.name.trim() || !edit.gc_name.trim() || !edit.start_date) {
      toastError('Name, general contractor, and start date are required.');
      return;
    }
    const amount = edit.contract_amount.trim() ? Number(edit.contract_amount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setEditErrors({ contract_amount: ['Enter the contract amount as a number.'] });
      return;
    }
    const body: Record<string, unknown> = {
      name: edit.name.trim(),
      gc_name: edit.gc_name.trim(),
      start_date: edit.start_date,
      owner_name: edit.owner_name.trim() ? edit.owner_name.trim() : null,
      property_address: edit.property_address.trim() ? edit.property_address.trim() : null,
      notes: edit.notes.trim() ? edit.notes.trim() : null,
      contract_amount: amount,
    };
    const stateChanged = Boolean(edit.state_code) && edit.state_code !== job?.state_code;
    if (stateChanged) body.state_code = edit.state_code;
    const ok = await patchJob(body, 'edit', stateChanged ? 'Job saved. Every deadline recalculated for the new state.' : 'Job details saved.');
    if (ok) setEditing(false);
  }

  if (loading) {
    return (
      <div>
        <p className="sr-only" role="status">Loading this job</p>
        <div className="space-y-4" aria-hidden="true">
          <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (loadError || !job) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{loadError ?? 'We could not find that job.'}</p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => void load()} className={BTN_PRIMARY}>Try again</button>
          <Link href="/jobs" className={BTN_SECONDARY}>Back to jobs</Link>
        </div>
      </div>
    );
  }

  const upcomingCount = deadlines.filter((row) => row.status === 'upcoming').length;
  const statusChip =
    job.status === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : job.status === 'completed'
        ? 'border-sky-200 bg-sky-50 text-sky-700'
        : 'border-slate-200 bg-slate-100 text-slate-600';

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} />
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/jobs" className="text-brand-700 hover:underline">Jobs</Link>
        <span className="text-slate-400"> / {job.name}</span>
      </nav>

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-slate-900">{job.name}</h1>
              <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize', statusChip)}>{job.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{stateName(job.state_code)} · GC {job.gc_name} · started {formatDate(job.start_date)}</p>
            {job.contract_amount !== null && <p className="mt-0.5 text-sm text-slate-500">Contract {formatMoney(Math.round(Number(job.contract_amount) * 100))}</p>}
            {job.owner_name && <p className="mt-0.5 text-sm text-slate-500">Owner {job.owner_name}</p>}
            {job.property_address && <p className="mt-0.5 text-sm text-slate-500">{job.property_address}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditing((value) => !value)} className={BTN_SECONDARY}>{editing ? 'Close editor' : 'Edit details'}</button>
            {job.status === 'active' && (
              <button type="button" onClick={() => void patchJob({ status: 'completed' }, 'status', 'Job marked completed.')} disabled={busy === 'status'} className={BTN_SECONDARY}>Mark job completed</button>
            )}
            {job.status === 'completed' && (
              <button type="button" onClick={() => void patchJob({ status: 'active' }, 'status', 'Job is active again.')} disabled={busy === 'status'} className={BTN_SECONDARY}>Reopen job</button>
            )}
            {job.status !== 'archived' ? (
              <button type="button" onClick={() => void archiveJob()} disabled={busy === 'archive'} className="inline-flex items-center justify-center rounded-lg border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60">Archive</button>
            ) : (
              <button type="button" onClick={() => void patchJob({ status: 'active' }, 'status', 'Job restored. Deadlines are back on the clock.')} disabled={busy === 'status'} className={BTN_PRIMARY}>Restore job</button>
            )}
          </div>
        </div>
        {job.notes && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{job.notes}</p>}
      </header>

      {editing && (
        <form onSubmit={handleEditSubmit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">Edit job details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-state" className={LABEL_CLASS}>State</label>
              <select id="edit-state" className={INPUT_CLASS} value={edit.state_code} onChange={(e) => setEdit((prev) => ({ ...prev, state_code: e.target.value }))}>
                {(stateOptions.some((option) => option.code === edit.state_code) ? stateOptions : [{ code: edit.state_code, name: stateName(edit.state_code) }, ...stateOptions]).map((option) => (
                  <option key={option.code} value={option.code}>{option.name}</option>
                ))}
              </select>
              {edit.state_code !== job.state_code && <p className="mt-1 text-xs text-amber-600">Saving moves this job to {stateName(edit.state_code)} and recalculates every deadline under that state&apos;s statutes.</p>}
              <FieldError errors={editErrors.state_code} />
            </div>
            <div>
              <label htmlFor="edit-name" className={LABEL_CLASS}>Job name</label>
              <input id="edit-name" className={INPUT_CLASS} value={edit.name} onChange={(e) => setEdit((prev) => ({ ...prev, name: e.target.value }))} maxLength={200} />
              <FieldError errors={editErrors.name} />
            </div>
            <div>
              <label htmlFor="edit-gc" className={LABEL_CLASS}>General contractor</label>
              <input id="edit-gc" className={INPUT_CLASS} value={edit.gc_name} onChange={(e) => setEdit((prev) => ({ ...prev, gc_name: e.target.value }))} maxLength={200} />
              <FieldError errors={editErrors.gc_name} />
            </div>
            <div>
              <label htmlFor="edit-start" className={LABEL_CLASS}>First day on site</label>
              <input id="edit-start" type="date" className={INPUT_CLASS} value={edit.start_date} onChange={(e) => setEdit((prev) => ({ ...prev, start_date: e.target.value }))} />
              <FieldError errors={editErrors.start_date} />
            </div>
            <div>
              <label htmlFor="edit-amount" className={LABEL_CLASS}>Contract amount</label>
              <input id="edit-amount" inputMode="decimal" className={INPUT_CLASS} value={edit.contract_amount} onChange={(e) => setEdit((prev) => ({ ...prev, contract_amount: e.target.value }))} />
              <FieldError errors={editErrors.contract_amount} />
            </div>
            <div>
              <label htmlFor="edit-owner" className={LABEL_CLASS}>Property owner</label>
              <input id="edit-owner" className={INPUT_CLASS} value={edit.owner_name} onChange={(e) => setEdit((prev) => ({ ...prev, owner_name: e.target.value }))} maxLength={200} />
              <FieldError errors={editErrors.owner_name} />
            </div>
            <div>
              <label htmlFor="edit-address" className={LABEL_CLASS}>Property address</label>
              <input id="edit-address" className={INPUT_CLASS} value={edit.property_address} onChange={(e) => setEdit((prev) => ({ ...prev, property_address: e.target.value }))} maxLength={500} />
              <FieldError errors={editErrors.property_address} />
            </div>
          </div>
          <div>
            <label htmlFor="edit-notes" className={LABEL_CLASS}>Notes</label>
            <textarea id="edit-notes" rows={3} className={INPUT_CLASS} value={edit.notes} onChange={(e) => setEdit((prev) => ({ ...prev, notes: e.target.value }))} maxLength={2000} />
            <FieldError errors={editErrors.notes} />
          </div>
          <p className="text-xs text-slate-400">Changing the state instantly rebuilds this job&apos;s deadline timeline under that state&apos;s statutes.</p>
          <div className="flex gap-3">
            <button type="submit" disabled={busy === 'edit'} className={BTN_PRIMARY}>{busy === 'edit' ? 'Saving...' : 'Save changes'}</button>
            <button type="button" onClick={() => setEditing(false)} className={BTN_SECONDARY}>Cancel</button>
          </div>
        </form>
      )}

      {job.status !== 'archived' && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className={cn('rounded-2xl border p-5 shadow-sm', job.completion_date ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50')}>
            <h2 className="text-sm font-bold text-slate-900">Completion date</h2>
            <p className="mt-1 text-xs text-slate-600">
              {job.completion_date
                ? 'Update this if the finish date moved. Lien and enforcement windows recalculate instantly.'
                : 'Completion starts the lien filing and enforcement clocks. Add it the day the work wraps, or a best estimate now.'}
            </p>
            <div className="mt-3 flex gap-2">
              <input type="date" aria-label="Completion date" className={INPUT_CLASS} value={completionInput} onChange={(e) => setCompletionInput(e.target.value)} />
              <button
                type="button"
                disabled={!completionInput || busy === 'completion'}
                onClick={() => void patchJob({ completion_date: completionInput }, 'completion', 'Completion date saved. Deadlines recalculated.')}
                className={cn(BTN_PRIMARY, 'shrink-0')}
              >
                {busy === 'completion' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Lien filed date</h2>
            <p className="mt-1 text-xs text-slate-600">Recorded a lien on this job? Enter the filed date and the enforcement window switches from estimated to exact.</p>
            <div className="mt-3 flex gap-2">
              <input type="date" aria-label="Lien filed date" className={INPUT_CLASS} value={lienInput} onChange={(e) => setLienInput(e.target.value)} />
              <button
                type="button"
                disabled={!lienInput || busy === 'lien'}
                onClick={() => void patchJob({ lien_filed_date: lienInput }, 'lien', 'Lien filed date saved. Enforcement deadline is now exact.')}
                className={cn(BTN_PRIMARY, 'shrink-0')}
              >
                {busy === 'lien' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900">Deadline timeline</h2>
          <p className="text-xs text-slate-500">{upcomingCount} upcoming</p>
        </div>
        {deadlines.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No deadlines yet. Check the state and dates above.</p>
        ) : (
          <ol className="mt-5 space-y-5 border-l-2 border-slate-100 pl-5">
            {deadlines.map((row) => {
              const done = row.status === 'completed';
              const missed = row.status === 'missed';
              const paused = row.status === 'not_applicable';
              const dotClass = done
                ? 'bg-emerald-500'
                : paused
                  ? 'bg-slate-300'
                  : missed || row.days_remaining <= 7
                    ? 'bg-red-500'
                    : row.days_remaining <= 30
                      ? 'bg-amber-500'
                      : 'bg-emerald-500';
              return (
                <li key={row.id} className="relative">
                  <span aria-hidden="true" className={cn('absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white', dotClass)} />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn('text-sm font-semibold', done ? 'text-slate-400 line-through' : 'text-slate-900')}>{DEADLINE_TYPE_LABELS[row.deadline_type] ?? row.deadline_type}</p>
                        {row.is_estimated && !done && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">estimated</span>}
                        {done && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Done{row.completed_at ? ` ${formatDate(row.completed_at)}` : ''}</span>}
                        {missed && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Missed</span>}
                        {paused && <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Paused</span>}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">Due {formatDate(row.due_date)} · counted {ANCHOR_LABELS[row.anchor_event] ?? row.anchor_event}</p>
                      {row.statute_citation && <p className="mt-0.5 text-xs font-medium text-slate-500">{row.statute_citation}</p>}
                      {row.description && <p className="mt-1 text-xs text-slate-400">{row.description}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {row.status === 'upcoming' && (
                        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', URGENCY_BADGE[urgencyFor(row.days_remaining)])}>
                          <span className="sr-only">Urgency level. </span>
                          {daysRemainingLabel(row.days_remaining)}
                        </span>
                      )}
                      {(row.status === 'upcoming' || missed) && (
                        <button
                          type="button"
                          onClick={() => void setDeadlineStatus(row, 'completed')}
                          disabled={busy === `deadline-${row.id}`}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                        >
                          {busy === `deadline-${row.id}` ? 'Saving...' : 'Mark done'}
                        </button>
                      )}
                      {done && (
                        <button type="button" onClick={() => void setDeadlineStatus(row, 'upcoming')} disabled={busy === `deadline-${row.id}`} className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-60">Undo</button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">
          Email reminders go out ahead of every upcoming deadline. Tune the schedule in <Link href="/settings" className="underline">Settings</Link>. LienClock is not legal advice and never files anything for you.
        </p>
      </section>
    </div>
  );
}
