import { Badge, CountUp } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { PROGRESS, STATUS } from './constants.js'

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, tone: 'neutral' }
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  )
}

// Six-step track for an event on the day. `onStep` makes the steps clickable.
export function ProgressTrack({ progress, onStep, busy, compact = false }) {
  const index = PROGRESS.findIndex((p) => p.id === progress)
  return (
    <ol className={`grid grid-cols-6 gap-1.5 ${busy ? 'opacity-60' : ''}`} aria-label="Event progress">
      {PROGRESS.map((step, i) => {
        const done = i < index
        const active = i === index
        const clickable = onStep && !busy && i !== index
        return (
          <li key={step.id} className="min-w-0">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStep?.(step.id)}
              title={step.label}
              aria-current={active ? 'step' : undefined}
              className={`group block w-full text-left ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`block h-1.5 rounded-full transition-colors duration-300 ${
                  done ? 'bg-kashi-500' : active ? 'bg-brand-600' : 'bg-ink-200 group-enabled:group-hover:bg-ink-300'
                }`}
              />
              {!compact && (
                <span
                  className={`mt-1.5 block truncate text-[11px] font-medium ${active ? 'text-brand-700' : done ? 'text-kashi-700' : 'text-ink-400'}`}
                >
                  {step.short}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function Meta({ icon, children }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-ink-500">
      <Icon name={icon} className="h-4 w-4 shrink-0 text-ink-400" />
      <span className="truncate">{children}</span>
    </span>
  )
}

export function Stat({ label, value, tone = 'text-ink-900', hint }) {
  return (
    <div className="rounded-panel bg-white px-5 py-4 shadow-glaze ring-1 ring-ink-200/70">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`tabular mt-1 font-display text-3xl ${tone}`}>
        <CountUp value={value} />
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}
