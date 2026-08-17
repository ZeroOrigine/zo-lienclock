// CANONICAL: shared FAQ accordion item, native details element, no client JS.
export default function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900">
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden dark:text-white">
        {q}
        <span aria-hidden="true" className="text-2xl font-light leading-none text-slate-400 transition-transform duration-200 group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{a}</p>
    </details>
  )
}
