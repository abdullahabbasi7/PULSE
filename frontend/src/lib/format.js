// Formatting helpers shared by the modules.

// Today's date (YYYY-MM-DD) in the company's time zone, not the browser's.
export function todayIn(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDate(iso, { weekday = true, year = false } = {}) {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return d.toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: weekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: year ? 'numeric' : undefined,
  })
}

// "18:30:00" → "6:30 pm"
export function formatTime(value) {
  if (!value) return ''
  const [h, m] = value.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`
}

export function timeRange(start, end) {
  if (!start) return 'Time not set'
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

// Timestamp in the company's zone, e.g. "29 Oct, 9:41 am".
export function formatDateTime(iso, timeZone) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', { timeZone, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return new Date(iso).toLocaleString()
  }
}

export function clockTime(iso, timeZone) {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return new Date(iso).toLocaleTimeString()
  }
}

export function formatNumber(value) {
  if (value == null || value === '') return '—'
  return Number(value).toLocaleString('en-US')
}

export function formatMoney(value) {
  if (value == null || value === '') return '—'
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function percent(value, digits = 0) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(digits)}%`
}
