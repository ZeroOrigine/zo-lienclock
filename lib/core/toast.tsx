'use client';
// CANONICAL: minimal toast hook and viewport shared by dashboard pages; sits above the mobile tab bar.
import { useCallback, useState } from 'react';
import { cn } from '@/lib/core/format';

export interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback((kind: ToastItem['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, kind, text }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 5000);
  }, []);
  const success = useCallback((text: string) => push('success', text), [push]);
  const error = useCallback((text: string) => push('error', text), [push]);
  return { toasts, success, error };
}

export function ToastViewport({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-8"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            'pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
            item.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          )}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}
