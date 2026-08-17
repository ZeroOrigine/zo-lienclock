'use client';
// CANONICAL: shared UI primitives and class constants for dashboard pages.
import { cn } from '@/lib/core/format';

export const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
export const LABEL_CLASS = 'mb-1 block text-sm font-medium text-slate-700';
export const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60';
export const BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60';

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {errors[0]}
    </p>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-brand-600' : 'bg-slate-300',
        disabled ? 'cursor-not-allowed opacity-50' : ''
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}
