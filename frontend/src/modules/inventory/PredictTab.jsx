import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, CONTROL, Field, SelectField, useFormGuard } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, errorText } from '../../lib/api.js'
import { formatNumber, percent } from '../../lib/format.js'
import { EVENT_LABEL, EVENT_TYPES } from '../bookings/constants.js'
import { EventSelect } from './shared.jsx'

const STYLES = [
  { value: 'buffet', label: 'Buffet' },
  { value: 'plated', label: 'Plated (served at table)' },
  { value: 'family_style', label: 'Family style (shared dishes)' },
]

export function PredictTab({ events, bookingId, setBookingId }) {
  const guard = useFormGuard()
  const [mode, setMode] = useState(bookingId ? 'event' : 'manual')
  const [form, setForm] = useState({ guest_count: '300', event_type: 'wedding', service_style: 'buffet', menu: 'chicken biryani, mutton qorma, naan, raita, salad, kheer, cold drinks' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function run(override) {
    setError('')
    if ((override ?? mode) === 'manual' && !guard(document.getElementById('p_guests')?.closest('section'))) return
    setBusy(true)
    const useEvent = (override ?? mode) === 'event'
    try {
      const body = useEvent
        ? { booking_id: bookingId, service_style: form.service_style }
        : { guest_count: Number(form.guest_count), event_type: form.event_type, service_style: form.service_style, menu: form.menu }
      setResult(await api('/inventory/predict', { method: 'POST', body }))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (bookingId && mode === 'event') run('event')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const shortfalls = result?.lines.filter((l) => l.shortfall > 0) || []
  const event = events.find((b) => b.id === bookingId)

  return (
    <div className="grid animate-page-in items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card title="Event details" description="The model predicts what to load from the guest count, event type, service style and menu.">
        <div className="mb-4 inline-flex rounded-xl bg-ink-100 p-1 text-sm font-semibold">
          {[
            ['event', 'From a booking'],
            ['manual', 'Quick estimate'],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMode(id)} className={`rounded-lg px-3 py-1.5 transition-colors ${mode === id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {mode === 'event' ? (
            <>
              <EventSelect id="pred_event" value={bookingId} onChange={setBookingId} events={events} />
              {event && (
                <p className="rounded-xl bg-ink-50 px-3.5 py-2.5 text-sm text-ink-600">
                  {formatNumber(event.guest_count)} guests · {EVENT_LABEL[event.event_type]}
                  {event.menu && <span className="mt-0.5 block text-xs text-ink-500">Menu: {event.menu}</span>}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field id="p_guests" kind="count" required label="Guests" type="text" inputMode="numeric" value={form.guest_count} onChange={set('guest_count')} />
                <SelectField id="p_type" label="Event type" options={EVENT_TYPES} value={form.event_type} onChange={set('event_type')} />
              </div>
              <div>
                <label htmlFor="p_menu" className="mb-1.5 block text-sm font-medium text-ink-700">Menu</label>
                <textarea id="p_menu" className={`${CONTROL} min-h-[5rem]`} value={form.menu} onChange={set('menu')} />
              </div>
            </>
          )}
          <SelectField id="p_style" label="Service style" options={STYLES} value={form.service_style} onChange={set('service_style')} />
          <Button onClick={() => run()} loading={busy} disabled={mode === 'event' ? !bookingId : !form.guest_count}>
            <Icon name="sparkle" className="h-4 w-4" />
            Predict equipment
          </Button>
          <Alert key={error}>{error}</Alert>
        </div>
      </Card>

      <Card
        title="What to send"
        description={result ? `${formatNumber(result.guest_count)} guests · ${EVENT_LABEL[result.event_type] || result.event_type} · ${STYLES.find((s) => s.value === result.service_style)?.label}` : 'Run a prediction to see the list.'}
        bodyClassName="px-0 pb-3 pt-4"
      >
        {!result && <p className="px-6 py-10 text-center text-sm text-ink-500">The list compares the AI prediction with the usual rule of thumb and your stock.</p>}
        {result && (
          <div className="animate-fade-in">
            {shortfalls.length > 0 ? (
              <div className="mx-5 mb-4 sm:mx-6">
                <Alert tone="warning">
                  Not enough stock for {shortfalls.map((l) => `${l.label.toLowerCase()} (short by ${formatNumber(l.shortfall)})`).join(', ')}. Hire or borrow before the event.
                </Alert>
              </div>
            ) : (
              <div className="mx-5 mb-4 sm:mx-6">
                <Alert tone="success">You have enough stock for everything on this list.</Alert>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-6 py-2.5 font-medium">Equipment</th>
                    <th className="px-3 py-2.5 text-right font-medium">AI prediction</th>
                    <th className="px-3 py-2.5 text-right font-medium">Rule of thumb</th>
                    <th className="px-6 py-2.5 text-right font-medium">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {result.lines.map((line) => (
                    <tr key={line.category}>
                      <td className="px-6 py-2.5 font-medium text-ink-900">{line.label}</td>
                      <td className="tabular px-3 py-2.5 text-right text-base font-semibold text-brand-700">{formatNumber(line.predicted)}</td>
                      <td className="tabular px-3 py-2.5 text-right text-ink-500">{formatNumber(line.rule_of_thumb)}</td>
                      <td className="px-6 py-2.5 text-right">
                        <span className="tabular text-ink-800">{formatNumber(line.available)}</span>
                        {line.shortfall > 0 && (
                          <span className="ml-2">
                            <Badge tone="danger">−{formatNumber(line.shortfall)}</Badge>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.model?.model_error != null && (
              <p className="mt-3 px-6 text-xs leading-relaxed text-ink-400">
                Gradient-boosted model trained on simulated past events. Average error {percent(result.model.model_error, 1)} against {percent(result.model.baseline_error, 1)} for the rule of thumb
                {result.model.error_reduction != null && ` (${percent(result.model.error_reduction)} lower)`}.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
