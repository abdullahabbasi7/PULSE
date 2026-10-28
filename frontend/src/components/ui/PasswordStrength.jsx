import { useState } from 'react'
import { passwordChecks, strengthScore, suggestPassword } from '../../lib/passwordRules.js'
import { Icon } from '../../layout/icons.jsx'

const LEVELS = [
  { label: 'Too weak', bar: 'bg-red-500', text: 'text-red-700' },
  { label: 'Weak', bar: 'bg-red-500', text: 'text-red-700' },
  { label: 'Fair', bar: 'bg-saffron-400', text: 'text-saffron-700' },
  { label: 'Good', bar: 'bg-kashi-400', text: 'text-kashi-700' },
  { label: 'Strong', bar: 'bg-kashi-600', text: 'text-kashi-700' },
]

function SuggestBox({ value }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked: the password is still visible to copy by hand.
    }
  }
  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-kashi-200 animate-fade-in">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Suggested password</p>
        <p className="select-all break-all font-mono text-sm font-semibold text-ink-900">{value}</p>
      </div>
      <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">
        <Icon name={copied ? 'check' : 'download'} className="h-3.5 w-3.5" />
        {copied ? 'Copied' : 'Copy'}
      </button>
      <p className="w-full text-[11px] text-ink-500">Save it in a password manager or somewhere safe before continuing.</p>
    </div>
  )
}

// Live checklist under a new-password field. Pass `onSuggest` to offer a generated password.
export function PasswordStrength({ password, email, fullName, onSuggest }) {
  const [suggested, setSuggested] = useState('')
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
      {onSuggest && (
        <button
          type="button"
          onClick={() => {
            const next = suggestPassword({ email, fullName })
            setSuggested(next)
            onSuggest(next)
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          <Icon name="sparkle" className="h-3.5 w-3.5" />
          {suggested && suggested === password ? 'Suggest another' : 'Suggest a strong password'}
        </button>
      )}
      {suggested && suggested === password && <SuggestBox value={suggested} />}
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
