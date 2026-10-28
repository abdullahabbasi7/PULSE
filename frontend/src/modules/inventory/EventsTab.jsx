import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, EmptyState, Skeleton, useToast } from '../../components/ui/index.js'
import { api, errorText } from '../../lib/api.js'
import { formatDate, formatNumber } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { CATEGORY_LABEL, EventSelect } from './shared.jsx'

function Total({ label, value, tone = 'text-ink-900' }) {
  return (
    <div className="rounded-xl bg-ink-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`tabular mt-0.5 text-2xl font-semibold ${tone}`}>{formatNumber(value)}</p>
    </div>
  )
}

export function EventsTab({ events, bookingId, setBookingId, canEdit, onChanged }) {
  const toast = useToast()
  const rec = useApi(bookingId ? `/inventory/bookings/${bookingId}/reconciliation` : null)
  const [busy, setBusy] = useState(null)
  const r = rec.data

  async function writeOff(line) {
    setBusy(line.item_id)
    try {
      await api('/inventory/movements', { method: 'POST', body: { booking_id: bookingId, item_id: line.item_id, direction: 'lost', quantity: line.outstanding, note: 'Written off from reconciliation' } })
      toast(`${line.outstanding} × ${line.item_name} written off as lost`)
      rec.reload()
      onChanged?.()
    } catch (err) {
      toast(errorText(err), 'danger')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="animate-page-in space-y-5">
      <Card>
        <div className="max-w-xl">
          <EventSelect id="rec_event" value={bookingId} onChange={setBookingId} events={events} label="Event to check" />
        </div>
      </Card>
      {!bookingId && <EmptyState title="Choose an event" icon="box">See everything that went to an event, what came back, what broke, and who sent out anything still missing.</EmptyState>}
      {bookingId && rec.error && <Alert>{rec.error}</Alert>}
      {bookingId && !r && !rec.error && <Skeleton className="h-48 w-full rounded-panel" />}
      {r && (
        <Card
          title={`${r.client_name} · ${formatDate(r.event_date, { year: true })}`}
          description={r.venue}
          actions={
            <Link to={`/bookings/${r.booking_id}`} className="text-sm font-semibold text-brand-700 hover:underline">
              Open booking
            </Link>
          }
          bodyClassName="px-0 pb-2 pt-4"
        >
          <div className="grid grid-cols-2 gap-3 px-5 sm:grid-cols-4 sm:px-6">
            <Total label="Sent" value={r.total_sent} />
            <Total label="Still out" value={r.total_outstanding} tone={r.total_outstanding ? 'text-saffron-700' : 'text-kashi-700'} />
            <Total label="Broken" value={r.total_damaged} tone={r.total_damaged ? 'text-red-700' : 'text-ink-900'} />
            <Total label="Lost" value={r.total_lost} tone={r.total_lost ? 'text-red-700' : 'text-ink-900'} />
          </div>
          {r.lines.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-ink-500">Nothing has been sent to this event yet. Use the Scan tab while loading.</p>
          ) : (
            <div className="mt-4 overflow-x-auto border-t border-ink-100">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Item</th>
                    <th className="px-3 py-3 text-right font-medium">Sent</th>
                    <th className="px-3 py-3 text-right font-medium">Back</th>
                    <th className="px-3 py-3 text-right font-medium">Broken</th>
                    <th className="px-3 py-3 text-right font-medium">Lost</th>
                    <th className="px-3 py-3 text-right font-medium">Still out</th>
                    <th className="px-6 py-3 font-medium">Sent by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {r.lines.map((line) => (
                    <tr key={line.item_id} className={line.outstanding ? 'bg-saffron-50/50' : ''}>
                      <td className="px-6 py-3">
                        <p className="font-semibold text-ink-900">{line.item_name}</p>
                        <p className="text-xs text-ink-500">{CATEGORY_LABEL[line.category]}</p>
                      </td>
                      <td className="tabular px-3 py-3 text-right">{formatNumber(line.sent)}</td>
                      <td className="tabular px-3 py-3 text-right">{formatNumber(line.returned)}</td>
                      <td className={`tabular px-3 py-3 text-right ${line.damaged ? 'text-red-700' : ''}`}>{formatNumber(line.damaged)}</td>
                      <td className={`tabular px-3 py-3 text-right ${line.lost ? 'text-red-700' : ''}`}>{formatNumber(line.lost)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`tabular font-semibold ${line.outstanding ? 'text-saffron-800' : 'text-kashi-700'}`}>{line.outstanding ? formatNumber(line.outstanding) : 'All back'}</span>
                        {canEdit && line.outstanding > 0 && (
                          <Button variant="ghost" size="sm" className="ml-1" loading={busy === line.item_id} onClick={() => writeOff(line)}>
                            Write off
                          </Button>
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs text-ink-500">{line.sent_by.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
