const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(20,27,66,0.25)] hover:bg-brand-700 disabled:bg-brand-300 disabled:shadow-none',
  secondary: 'bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300 disabled:text-ink-400',
  ghost: 'text-ink-700 hover:bg-ink-100 disabled:text-ink-400',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:text-brand-300',
  danger: 'bg-white text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50 disabled:text-red-300',
}

const SIZES = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-10 gap-2 rounded-[0.65rem] px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-5 text-[0.95rem]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex select-none items-center justify-center font-semibold transition-[background-color,box-shadow,color,transform] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}
