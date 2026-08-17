'use client';
// CANONICAL: root-segment error boundary covering marketing and auth pages
// (the dashboard segment has its own boundary).
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Something went sideways</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nothing was lost. Try again, and if it keeps happening give it a minute.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
