'use client';
// CANONICAL: dashboard error boundary.
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="font-display text-xl font-bold text-slate-900">That page hit a snag</h2>
      <p className="mt-2 text-sm text-slate-600">Nothing was lost. Try again, and if it keeps happening give it a minute.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Try again
      </button>
    </div>
  );
}
