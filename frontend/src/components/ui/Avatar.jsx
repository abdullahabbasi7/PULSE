// Initials in a glazed circle. The colour is picked from the name, so it stays stable.
const GLAZES = [
  'bg-brand-100 text-brand-800',
  'bg-kashi-100 text-kashi-800',
  'bg-saffron-100 text-saffron-800',
  'bg-ink-200 text-ink-800',
  'bg-brand-600 text-white',
  'bg-kashi-600 text-white',
]

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base', xl: 'h-24 w-24 text-2xl' }

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

// Shows the person's photo when they have one, otherwise their initials.
export function Avatar({ name, src, size = 'md', className = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`inline-block shrink-0 select-none rounded-full object-cover ring-2 ring-white ${SIZES[size]} ${className}`}
        aria-hidden="true"
      />
    )
  }
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
