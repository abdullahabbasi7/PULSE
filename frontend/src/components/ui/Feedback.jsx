import { Icon } from '../../layout/icons.jsx'

const TONES = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/80',
  success: 'bg-kashi-50 text-kashi-800 ring-1 ring-inset ring-kashi-200',
  warning: 'bg-saffron-50 text-saffron-800 ring-1 ring-inset ring-saffron-200',
  danger: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
}

const ALERT_ICONS = { danger: 'alert', warning: 'alert', success: 'check', brand: 'info', neutral: 'info' }

export function Badge({ tone = 'neutral', dot = false, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

// Inline message. It shakes once when an error appears so the change is noticed.
export function Alert({ tone = 'danger', children }) {
  if (!children) return null
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ${TONES[tone]} ${tone === 'danger' ? 'animate-shake' : 'animate-fade-in'}`}
    >
      <Icon name={ALERT_ICONS[tone]} className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
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

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function EmptyState({ title, children, action, icon = 'sparkle' }) {
  return (
    <div className="flex flex-col items-center rounded-panel border border-dashed border-ink-300 bg-white/60 px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {children && <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
