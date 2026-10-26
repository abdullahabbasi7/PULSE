// Initials in a glazed circle. The colour is picked from the name, so it stays stable.
const GLAZES = [
  'bg-brand-100 text-brand-800',
  'bg-kashi-100 text-kashi-800',
  'bg-saffron-100 text-saffron-800',
  'bg-ink-200 text-ink-800',
  'bg-brand-600 text-white',
  'bg-kashi-600 text-white',
]

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

export function Avatar({ name, size = 'md', className = '' }) {
  let hash = 0
  for (const char of name || '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${GLAZES[hash % GLAZES.length]} ${SIZES[size]} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
