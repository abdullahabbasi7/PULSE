import { useState } from 'react'
import { Icon } from '../../layout/icons.jsx'

export const CONTROL =
  'block w-full rounded-[0.65rem] border-0 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-[0_1px_2px_rgba(23,28,52,0.04)] ring-1 ring-inset ring-ink-200 transition-[box-shadow,background-color] duration-150 placeholder:text-ink-400 hover:ring-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-ink-50 disabled:text-ink-500'

function Help({ id, hint, error }) {
  if (!hint && !error) return null
  return (
    <p id={`${id}-help`} className={`mt-1.5 text-xs ${error ? 'text-red-600' : 'text-ink-500'}`}>
      {error || hint}
    </p>
  )
}

// Same look as CONTROL but without full width, for inputs given their own width.
export const CONTROL_INLINE = CONTROL.replace('block w-full', 'block')

// Text input with label. Password fields get a show/hide toggle.
export function Field({ id, label, hint, error, className = '', type = 'text', ...inputProps }) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          className={`${CONTROL} ${isPassword ? 'pr-11' : ''} ${error ? 'ring-red-400' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={hint || error ? `${id}-help` : undefined}
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
      <Help id={id} hint={hint} error={error} />
    </div>
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
