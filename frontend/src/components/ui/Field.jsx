const CONTROL =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 disabled:bg-ink-50 disabled:text-ink-500'

export function Field({ id, label, hint, error, className = '', ...inputProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={id}
        className={`${CONTROL} ${error ? 'ring-red-400' : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={hint || error ? `${id}-help` : undefined}
        {...inputProps}
      />
      {(hint || error) && (
        <p id={`${id}-help`} className={`mt-1 text-xs ${error ? 'text-red-600' : 'text-ink-500'}`}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

export function SelectField({ id, label, options, className = '', ...selectProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <select id={id} className={CONTROL} {...selectProps}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
