import { passwordChecks, strengthScore } from '../../lib/passwordRules.js'
import { Icon } from '../../layout/icons.jsx'

const LEVELS = [
  { label: 'Too weak', bar: 'bg-red-500', text: 'text-red-700' },
  { label: 'Weak', bar: 'bg-red-500', text: 'text-red-700' },
  { label: 'Fair', bar: 'bg-saffron-400', text: 'text-saffron-700' },
  { label: 'Good', bar: 'bg-kashi-400', text: 'text-kashi-700' },
  { label: 'Strong', bar: 'bg-kashi-600', text: 'text-kashi-700' },
]

// Live checklist under a new-password field.
export function PasswordStrength({ password, email, fullName }) {
  const checks = passwordChecks(password, { email, fullName })
  const allOk = checks.every((c) => c.ok)
  const score = allOk ? Math.max(3, strengthScore(password, { email, fullName })) : Math.min(2, strengthScore(password, { email, fullName }))
  const level = LEVELS[password ? score : 0]
  return (
    <div className="mt-2 rounded-xl bg-ink-50 px-3.5 py-3 ring-1 ring-inset ring-ink-200/70" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${password && score >= n ? level.bar : 'bg-ink-200'}`} />
          ))}
        </div>
        <span className={`w-16 text-right text-xs font-semibold ${password ? level.text : 'text-ink-400'}`}>
          {password ? level.label : 'Required'}
        </span>
      </div>
      <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs transition-colors ${c.ok ? 'text-kashi-700' : 'text-ink-500'}`}>
            <Icon name={c.ok ? 'check' : 'minus'} className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
