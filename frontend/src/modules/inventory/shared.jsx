import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { CONTROL } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { addDays, formatDate, todayIn } from '../../lib/format.js'
import { query, useApi } from '../../lib/useApi.js'
import { EVENT_LABEL } from '../bookings/constants.js'

export const CATEGORIES = [
  { value: 'dinner_plate', label: 'Dinner plates' },
  { value: 'dessert_plate', label: 'Dessert plates' },
  { value: 'bowl', label: 'Bowls' },
  { value: 'glass', label: 'Glasses' },
  { value: 'cup', label: 'Tea cups' },
  { value: 'cutlery_set', label: 'Cutlery sets' },
  { value: 'chafing_dish', label: 'Chafing dishes' },
  { value: 'serving_dish', label: 'Serving dishes' },
  { value: 'chair', label: 'Chairs' },
  { value: 'table', label: 'Tables' },
  { value: 'tablecloth', label: 'Tablecloths' },
  { value: 'other', label: 'Other' },
]
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))

export function QrImage({ value, size = 160, className = '' }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: 'M', color: { dark: '#171c34', light: '#ffffff' } })
      .then((url) => alive && setSrc(url))
      .catch(() => setSrc(''))
    return () => {
      alive = false
    }
  }, [value, size])
  if (!src) return <div className={`skeleton ${className}`} style={{ width: size, height: size }} />
  return <img src={src} width={size} height={size} alt={`QR code ${value}`} className={className} />
}

// Bookings around today, for choosing which event equipment goes to.
export function useEventChoices() {
  const { company } = useAuth()
  const today = todayIn(company.timezone)
  const { data, error } = useApi(`/bookings${query({ date_from: addDays(today, -45), date_to: addDays(today, 60) })}`)
  const events = (data || []).filter((b) => b.status !== 'cancelled')
  return { events, error, today, loaded: Boolean(data) }
}

export function EventSelect({ value, onChange, events, label = 'Event', id = 'event' }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <div className="relative">
        <select id={id} className={`${CONTROL} appearance-none pr-10`} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose an event</option>
          {events.map((b) => (
            <option key={b.id} value={b.id}>
              {formatDate(b.event_date)} · {EVENT_LABEL[b.event_type]} · {b.client.name} ({b.guest_count} guests)
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
    </div>
  )
}
