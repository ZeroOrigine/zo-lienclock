'use client';
// CANONICAL: add-a-job flow with the instant statutory deadline preview and a celebration state.
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { zoEvent } from '@/components/ZoBeacon';
import { apiGet, apiSend } from '@/lib/core/api';
import { ToastViewport, useToasts } from '@/lib/core/toast';
import { BTN_PRIMARY, BTN_SECONDARY, FieldError, INPUT_CLASS, LABEL_CLASS } from '@/lib/core/ui';
import { ANCHOR_LABELS, DEADLINE_TYPE_LABELS, URGENCY_BADGE, cn, daysRemainingLabel, formatDate, stateName, urgencyFor } from '@/lib/core/format';

// #100: a descendant reads URL search params (useSearchParams); opt this
// route out of static generation so `next build` does not CSR-bail.
export const dynamic = 'force-dynamic';

interface PreviewDeadline {
  deadline_type: string;
  anchor_event: string;
  due_date: string | null;
  is_estimated: boolean;
  days_remaining: number | null;
  requires_completion_date: boolean;
  statute_citation: string;
  description: string;
}
interface PreviewPayload { deadlines: PreviewDeadline[]; disclaimer: string }
interface SavedDeadline { id: string; deadline_type: string; due_date: string; is_estimated: boolean; days_remaining: number; statute_citation: string | null }
interface SavedPayload { job: { id: string; name: string }; deadlines: SavedDeadline[] }
interface Usage { plan_name: string; max_active_jobs: number | null; active_jobs: number; can_add_job: boolean }

export default function NewJobPage() {
  const { toasts, error: toastError } = useToasts();
  const [coveredStates, setCoveredStates] = useState<string[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [existingTotal, setExistingTotal] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [gcName, setGcName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedPayload | null>(null);

  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [statesResult, jobsResult] = await Promise.all([
        apiGet<{ covered_states: string[] }>('/api/states'),
        apiGet<{ usage: Usage; pagination: { total: number } }>('/api/jobs?status=all&limit=1'),
      ]);
      if (cancelled) return;
      if (statesResult.failure) toastError(statesResult.failure.message);
      else setCoveredStates(statesResult.data.covered_states);
      if (!jobsResult.failure) {
        setUsage(jobsResult.data.usage);
        setExistingTotal(jobsResult.data.pagination.total);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toastError]);

  useEffect(() => {
    if (!stateCode || !startDate) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ state: stateCode, start: startDate });
      if (completionDate) params.set('completion', completionDate);
      const result = await apiGet<PreviewPayload>(`/api/calculate?${params.toString()}`);
      if (cancelled) return;
      setPreviewLoading(false);
      if (result.failure) {
        setPreview(null);
        setPreviewError(result.failure.message);
        return;
      }
      setPreviewError(null);
      setPreview(result.data);
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [stateCode, startDate, completionDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Record<string, string[]> = {};
    if (!name.trim()) problems.name = ['Give this job a name.'];
    if (!stateCode) problems.state_code = ['Pick the state where the job is located.'];
    if (!gcName.trim()) problems.gc_name = ['Enter the general contractor name.'];
    if (!startDate) problems.start_date = ['Enter the start date.'];
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems);
      setFormError('Check the highlighted fields and try again.');
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSaving(true);
    const body: Record<string, unknown> = { name: name.trim(), state_code: stateCode, gc_name: gcName.trim(), start_date: startDate };
    if (completionDate) body.completion_date = completionDate;
    if (ownerName.trim()) body.owner_name = ownerName.trim();
    if (propertyAddress.trim()) body.property_address = propertyAddress.trim();
    if (notes.trim()) body.notes = notes.trim();
    if (contractAmount.trim()) {
      const amount = Number(contractAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        setSaving(false);
        setFieldErrors({ contract_amount: ['Enter the contract amount as a number.'] });
        return;
      }
      body.contract_amount = amount;
    }
    const result = await apiSend<SavedPayload>('/api/jobs', 'POST', body);
    setSaving(false);
    if (result.failure) {
      setFormError(result.failure.message);
      if (result.failure.details) setFieldErrors(result.failure.details);
      return;
    }
    if (existingTotal === 0) zoEvent('activation');
    setSaved(result.data);
  }

  function resetForm() {
    setSaved(null);
    setName('');
    setStateCode('');
    setGcName('');
    setStartDate('');
    setCompletionDate('');
    setOwnerName('');
    setPropertyAddress('');
    setContractAmount('');
    setNotes('');
    setPreview(null);
    setFormError(null);
    setFieldErrors({});
    setExistingTotal((total) => (total ?? 0) + 1);
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <ToastViewport toasts={toasts} />
        <section className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</span>
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">{saved.job.name} is on the clock</h1>
          <p className="mt-2 text-sm text-slate-600">{saved.deadlines.length} {saved.deadlines.length === 1 ? 'deadline is' : 'deadlines are'} now tracked. Reminders are scheduled ahead of each one.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/jobs/${saved.job.id}`} className={BTN_PRIMARY}>View the timeline</Link>
            <button type="button" onClick={resetForm} className={BTN_SECONDARY}>Add another job</button>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">What is now tracked</h2>
          <ol className="mt-4 space-y-4">
            {saved.deadlines.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{DEADLINE_TYPE_LABELS[row.deadline_type] ?? row.deadline_type}{row.is_estimated ? ' (estimated)' : ''}</p>
                  <p className="text-xs text-slate-500">Due {formatDate(row.due_date)}{row.statute_citation ? ` · ${row.statute_citation}` : ''}</p>
                </div>
                <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold', URGENCY_BADGE[urgencyFor(row.days_remaining)])}>{daysRemainingLabel(row.days_remaining)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  return (
    <div>
      <ToastViewport toasts={toasts} />
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Add a job</h1>
        <p className="mt-1 text-sm text-slate-600">Three fields and the whole deadline timeline appears on the right. Save it and reminders take over.</p>
      </header>

      {usage && !usage.can_add_job && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your {usage.plan_name} plan is at its active job limit ({usage.active_jobs} of {usage.max_active_jobs}). <Link href="/billing" className="font-semibold underline">Upgrade for unlimited jobs</Link> or archive a finished one.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div>
            <label htmlFor="job-name" className={LABEL_CLASS}>Job name</label>
            <input id="job-name" className={INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} placeholder="Maple St office buildout" maxLength={200} />
            <FieldError errors={fieldErrors.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="job-state" className={LABEL_CLASS}>State</label>
              <select id="job-state" className={INPUT_CLASS} value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
                <option value="">Pick a state</option>
                {coveredStates.map((code) => (
                  <option key={code} value={code}>{stateName(code)}</option>
                ))}
              </select>
              <FieldError errors={fieldErrors.state_code} />
            </div>
            <div>
              <label htmlFor="job-gc" className={LABEL_CLASS}>General contractor</label>
              <input id="job-gc" className={INPUT_CLASS} value={gcName} onChange={(e) => setGcName(e.target.value)} placeholder="Summit Builders" maxLength={200} />
              <FieldError errors={fieldErrors.gc_name} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="job-start" className={LABEL_CLASS}>First day on site</label>
              <input id="job-start" type="date" className={INPUT_CLASS} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <FieldError errors={fieldErrors.start_date} />
            </div>
            <div>
              <label htmlFor="job-completion" className={LABEL_CLASS}>Completion date <span className="font-normal text-slate-400">(optional)</span></label>
              <input id="job-completion" type="date" className={INPUT_CLASS} value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
              <FieldError errors={fieldErrors.completion_date} />
            </div>
          </div>
          <button type="button" onClick={() => setShowMore((value) => !value)} aria-expanded={showMore} className="text-sm font-medium text-brand-700 hover:underline">
            {showMore ? 'Hide extra details' : 'Add owner, address, or contract amount'}
          </button>
          {showMore && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="job-owner" className={LABEL_CLASS}>Property owner</label>
                  <input id="job-owner" className={INPUT_CLASS} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} maxLength={200} />
                  <FieldError errors={fieldErrors.owner_name} />
                </div>
                <div>
                  <label htmlFor="job-amount" className={LABEL_CLASS}>Contract amount</label>
                  <input id="job-amount" inputMode="decimal" className={INPUT_CLASS} value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} placeholder="25000" />
                  <FieldError errors={fieldErrors.contract_amount} />
                </div>
              </div>
              <div>
                <label htmlFor="job-address" className={LABEL_CLASS}>Property address</label>
                <input id="job-address" className={INPUT_CLASS} value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} maxLength={500} />
                <FieldError errors={fieldErrors.property_address} />
              </div>
              <div>
                <label htmlFor="job-notes" className={LABEL_CLASS}>Notes</label>
                <textarea id="job-notes" rows={3} className={INPUT_CLASS} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
                <FieldError errors={fieldErrors.notes} />
              </div>
            </div>
          )}
          <button type="submit" disabled={saving} className={cn(BTN_PRIMARY, 'w-full py-3')}>
            {saving ? 'Saving and scheduling reminders...' : 'Start tracking this job'}
          </button>
          <p className="text-xs text-slate-400">LienClock never files anything for you. It keeps the windows in front of you so you can act in time.</p>
        </form>

        <section aria-label="Deadline preview" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">The clock for this job</h2>
          {!stateCode || !startDate ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Pick a state and a first day on site. Every notice, lien, and enforcement window for that state appears here instantly.</p>
          ) : previewLoading && !preview ? (
            <div className="mt-4 space-y-3" aria-hidden="true">
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : previewError ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{previewError}</p>
          ) : preview ? (
            <>
              <ol className="mt-5 space-y-5 border-l-2 border-slate-100 pl-5">
                {preview.deadlines.map((row) => {
                  const urgency = row.days_remaining === null ? null : urgencyFor(row.days_remaining);
                  return (
                    <li key={row.deadline_type} className="relative">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white',
                          urgency === 'past' || urgency === 'critical' ? 'bg-red-500' : urgency === 'soon' ? 'bg-amber-500' : urgency === 'clear' ? 'bg-emerald-500' : 'bg-slate-300'
                        )}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{DEADLINE_TYPE_LABELS[row.deadline_type] ?? row.deadline_type}</p>
                        {row.due_date && row.days_remaining !== null ? (
                          <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', URGENCY_BADGE[urgencyFor(row.days_remaining)])}>{daysRemainingLabel(row.days_remaining)}</span>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">Needs completion date</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {row.due_date
                          ? `Due ${formatDate(row.due_date)}${row.is_estimated ? ' (estimated)' : ''} · counted ${ANCHOR_LABELS[row.anchor_event] ?? row.anchor_event}`
                          : 'Add a completion date, even a rough one, to put this on the clock.'}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{row.statute_citation}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{row.description}</p>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">{preview.disclaimer}</p>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
