const TONES = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200',
  success: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
}

export function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export function Alert({ tone = 'danger', children }) {
  if (!children) return null
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ${TONES[tone]}`}>
      {children}
    </div>
  )
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-r-transparent" aria-hidden="true" />
      {label}
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-white px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
