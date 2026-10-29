import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../../layout/icons.jsx'
import { checkFields, fieldProblem, liveProblem } from '../../lib/validation.js'
import { useToast } from './Toast.jsx'

export const CONTROL =
  'block w-full rounded-[0.65rem] border-0 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-[0_1px_2px_rgba(23,28,52,0.04)] ring-1 ring-inset ring-ink-200 transition-[box-shadow,background-color] duration-150 placeholder:text-ink-400 hover:ring-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-ink-50 disabled:text-ink-500'

// Same look as CONTROL but without full width, for inputs given their own width.
export const CONTROL_INLINE = CONTROL.replace('block w-full', 'block')

function Help({ id, hint, error }) {
  if (error) {
    return (
      <p
        id={`${id}-help`}
        role="alert"
        key={error}
        className="relative mt-2 flex animate-pop-in items-start gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200"
      >
        <span className="absolute -top-1 left-4 h-2 w-2 rotate-45 bg-red-50 ring-1 ring-red-200 [clip-path:polygon(0_0,100%_0,0_100%)]" aria-hidden="true" />
        <Icon name="alert" className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>{error}</span>
      </p>
    )
  }
  if (!hint) return null
  return (
    <p id={`${id}-help`} className="mt-1.5 text-xs text-ink-500">
      {hint}
    </p>
  )
}

// Text input with label. Give it a `kind` (see lib/validation.js) to check what is typed:
// a wrong character is flagged at once, the full format when the field is left, and on
// submit through useFormGuard. Password fields get a show/hide toggle.
export function Field({ id, label, hint, error, className = '', type = 'text', kind, required, fieldName, onBlur, onChange, ...inputProps }) {
  const [revealed, setRevealed] = useState(false)
  const [touched, setTouched] = useState(false)
  const [live, setLive] = useState(null)
  const ref = useRef(null)
  const isPassword = type === 'password'
  const name = fieldName || (typeof label === 'string' ? label : id)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const mark = () => setTouched(true)
    el.addEventListener('pulse:check', mark)
    return () => el.removeEventListener('pulse:check', mark)
  }, [])

  const checkable = kind || required
  const problem = checkable && touched ? fieldProblem(kind, inputProps.value, { required, el: ref.current }) : null
  const shown = error || live || problem
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && revealed ? 'text' : type}
          className={`${CONTROL} ${isPassword ? 'pr-11' : ''} ${shown ? '!bg-red-50/40 !ring-2 !ring-red-400' : ''}`}
          aria-invalid={shown ? 'true' : undefined}
          aria-describedby={hint || shown ? `${id}-help` : undefined}
          data-kind={kind}
          data-required={required ? 'true' : undefined}
          data-label={name}
          onChange={(event) => {
            setLive(liveProblem(kind, event.target.value))
            onChange?.(event)
          }}
          onBlur={(event) => {
            if (checkable && event.target.value !== '') setTouched(true)
            onBlur?.(event)
          }}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[0.65rem] text-ink-400 transition-colors hover:text-ink-700"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
      <Help id={id} hint={hint} error={shown} />
    </div>
  )
}

// Returns guard(root): checks every field in a form or dialog before it is sent.
// When something is wrong it shows a pop-up naming the field and what it needs,
// marks the fields, focuses the first one and returns false.
export function useFormGuard() {
  const toast = useToast()
  return useCallback(
    (root) => {
      const target = root?.current ?? root ?? document.querySelector('[role="dialog"]')
      const problems = checkFields(target)
      if (!problems.length) return true
      const [first] = problems
      first.el.focus({ preventScroll: true })
      first.el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      toast(
        problems.length === 1
          ? `${first.label}: ${first.message}`
          : `${problems.length} fields need fixing. ${first.label}: ${first.message}`,
        'danger',
      )
      return false
    },
    [toast],
  )
}

export function SelectField({ id, label, options, hint, className = '', ...selectProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <div className="relative">
        <select id={id} className={`${CONTROL} appearance-none pr-10`} {...selectProps}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
      <Help id={id} hint={hint} />
    </div>
  )
}

// Number input with − and + buttons, for small counts like guests per table.
export function StepperField({ id, label, hint, value, onChange, min = 1, max = 100 }) {
  const number = Number(value) || min
  const set = (next) => onChange(String(Math.min(max, Math.max(min, next))))
  const stepButton =
    'flex h-10 w-10 items-center justify-center text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200 disabled:text-ink-300 disabled:hover:bg-transparent'
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <div className="inline-flex items-center overflow-hidden rounded-[0.65rem] bg-white shadow-[0_1px_2px_rgba(23,28,52,0.04)] ring-1 ring-inset ring-ink-200 focus-within:ring-2 focus-within:ring-brand-500">
        <button type="button" className={stepButton} onClick={() => set(number - 1)} disabled={number <= min} aria-label="Decrease">
          <Icon name="minus" className="h-4 w-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => set(number)}
          aria-describedby={hint ? `${id}-help` : undefined}
          className="tabular h-10 w-14 border-0 bg-transparent text-center text-base font-semibold text-ink-900 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button type="button" className={stepButton} onClick={() => set(number + 1)} disabled={number >= max} aria-label="Increase">
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
      <Help id={id} hint={hint} />
    </div>
  )
}
