import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { Alert, Button, Card, CONTROL, Field, Modal, PageHeader, Skeleton, useFormGuard, useToast } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, errorText } from '../../lib/api.js'
import { formatDate, formatDateTime, formatMoney, formatNumber, timeRange } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { EDIT_ROLES, EVENT_LABEL, PROGRESS, STATUS, STATUS_ACTION, TRANSITIONS } from './constants.js'
import { ProgressTrack, StatusBadge } from './parts.jsx'

const ACTION_TEXT = {
  created: 'Booking created',
  inquiry_read: 'Read by the AI inquiry reader',
  status: 'Status changed',
  progress: 'Live progress updated',
  edited: 'Details edited',
}

function EditModal({ booking, open, onClose, onSaved }) {
  const guard = useFormGuard()
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const current = form || {
    event_date: booking.event_date,
    start_time: booking.start_time?.slice(0, 5) || '',
    end_time: booking.end_time?.slice(0, 5) || '',
    venue: booking.venue,
    guest_count: String(booking.guest_count),
    menu: booking.menu || '',
    package: booking.package || '',
    quoted_amount: booking.quoted_amount ?? '',
    notes: booking.notes || '',
  }
  const set = (key) => (e) => setForm({ ...current, [key]: e.target.value })

  async function save() {
    if (!guard()) return
    if (current.start_time && current.end_time && current.end_time <= current.start_time) {
      setError('The end time must be after the start time.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const updated = await api(`/bookings/${booking.id}`, {
        method: 'PATCH',
        body: {
          event_date: current.event_date,
          start_time: current.start_time || null,
          end_time: current.end_time || null,
          venue: current.venue.trim(),
          guest_count: Number(current.guest_count),
          menu: current.menu.trim() || null,
          package: current.package.trim() || null,
          quoted_amount: current.quoted_amount === '' ? null : Number(current.quoted_amount),
          notes: current.notes.trim() || null,
        },
      })
      setForm(null)
      onSaved(updated)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="calendar"
      title="Edit booking"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save changes</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="e_date" kind="date" required label="Date" type="date" value={current.event_date} onChange={set('event_date')} />
        <Field id="e_start" kind="time" label="Start" type="time" value={current.start_time} onChange={set('start_time')} />
        <Field id="e_end" kind="time" label="End" type="time" value={current.end_time} onChange={set('end_time')} />
        <Field id="e_venue" kind="words" required label="Venue" value={current.venue} onChange={set('venue')} className="sm:col-span-2" />
        <Field id="e_guests" kind="count" required label="Guests" type="text" inputMode="numeric" value={current.guest_count} onChange={set('guest_count')} />
        <Field id="e_package" label="Package" value={current.package} onChange={set('package')} />
        <Field id="e_amount" kind="money" label="Quoted amount" type="text" inputMode="numeric" value={current.quoted_amount} onChange={set('quoted_amount')} />
        <div className="sm:col-span-3">
          <label htmlFor="e_menu" className="mb-1.5 block text-sm font-medium text-ink-700">Menu</label>
          <textarea id="e_menu" className={`${CONTROL} min-h-[4rem]`} value={current.menu} onChange={set('menu')} />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="e_notes" className="mb-1.5 block text-sm font-medium text-ink-700">Notes</label>
          <textarea id="e_notes" className={`${CONTROL} min-h-[4rem]`} value={current.notes} onChange={set('notes')} />
        </div>
      </div>
      <div className="mt-4">
        <Alert key={error}>{error}</Alert>
      </div>
    </Modal>
  )
}

export function BookingDetail() {
  const { id } = useParams()
  const { user, company } = useAuth()
  const toast = useToast()
  const booking = useApi(`/bookings/${id}`)
  const history = useApi(`/bookings/${id}/history`)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const canEdit = EDIT_ROLES.includes(user.role)
  const b = booking.data

  async function post(path, body, message) {
    setBusy(true)
    try {
      booking.setData(await api(`/bookings/${id}/${path}`, { method: 'POST', body }))
      history.reload()
      toast(message)
    } catch (err) {
      toast(errorText(err), 'danger')
    } finally {
      setBusy(false)
    }
  }

  if (booking.error) return <Alert>{booking.error}</Alert>
  if (!b)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-60 w-full rounded-panel" />
      </div>
    )

  const live = ['confirmed', 'in_progress'].includes(b.status)
  const details = [
    ['Date', formatDate(b.event_date, { year: true })],
    ['Time', timeRange(b.start_time, b.end_time)],
    ['Venue', b.venue],
    ['Guests', formatNumber(b.guest_count)],
    ['Package', b.package || '—'],
    ['Quoted amount', formatMoney(b.quoted_amount)],
  ]

  return (
    <>
      <Link to="/bookings?tab=all" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <Icon name="arrowLeft" className="h-4 w-4" />
        Bookings
      </Link>
      <PageHeader
        context={<StatusBadge status={b.status} />}
        title={`${EVENT_LABEL[b.event_type]} · ${b.client.name}`}
        description={`${formatDate(b.event_date, { year: true })}, ${timeRange(b.start_time, b.end_time)} at ${b.venue}`}
        actions={
          canEdit && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Icon name="edit" className="h-4 w-4" />
              Edit
            </Button>
          )
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          {canEdit && TRANSITIONS[b.status].length > 0 && (
            <Card title="Next step" description="Move the booking along. Every change is recorded in the history.">
              <div className="flex flex-wrap gap-2">
                {TRANSITIONS[b.status].map((next) => (
                  <Button
                    key={next}
                    variant={next === 'cancelled' ? 'danger' : ['confirmed', 'in_progress', 'completed'].includes(next) ? 'primary' : 'secondary'}
                    disabled={busy}
                    onClick={() => post('status', { status: next }, `Booking is now ${STATUS[next].label.toLowerCase()}`)}
                  >
                    {STATUS_ACTION[next]}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          <Card title="On the day" description={live ? 'Tap a step to update the live board.' : 'Live progress is available once the booking is confirmed.'}>
            <ProgressTrack progress={b.progress} busy={busy} onStep={live ? (p) => post('progress', { progress: p }, `Progress: ${PROGRESS.find((x) => x.id === p).label}`) : null} />
          </Card>

          <Card title="Details">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-900">{value}</dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Menu</dt>
                <dd className="mt-0.5 text-sm text-ink-800">{b.menu || '—'}</dd>
              </div>
              {b.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Notes</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-ink-800">{b.notes}</dd>
                </div>
              )}
            </dl>
            {b.inquiry_text && (
              <div className="mt-5 rounded-xl bg-brand-50/60 p-4 ring-1 ring-brand-100">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  <Icon name="sparkle" className="h-3.5 w-3.5" />
                  Original client message
                </p>
                <p className="whitespace-pre-wrap text-sm text-ink-700">{b.inquiry_text}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Client">
            <p className="font-semibold text-ink-900">{b.client.name}</p>
            {b.client.phone && (
              <a href={`tel:${b.client.phone}`} className="mt-1 flex items-center gap-1.5 text-sm text-brand-700 hover:underline">
                <Icon name="phone" className="h-4 w-4" />
                {b.client.phone}
              </a>
            )}
            {b.client.email && <p className="mt-1 text-sm text-ink-500">{b.client.email}</p>}
          </Card>

          <Card title="Equipment" description="Plan and track crockery for this event in Inventory.">
            <div className="flex flex-wrap gap-2">
              <Link to={`/inventory?tab=predict&booking=${b.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-50 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100">
                <Icon name="sparkle" className="h-4 w-4" />
                Predict equipment
              </Link>
              <Link to={`/inventory?tab=events&booking=${b.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
                <Icon name="box" className="h-4 w-4" />
                Out & returned
              </Link>
            </div>
          </Card>

          <Card title="History">
            {!history.data && <Skeleton className="h-20 w-full" />}
            {history.data && (
              <ol className="relative space-y-4 border-l border-ink-200 pl-5">
                {history.data.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
                    <p className="text-sm font-medium text-ink-900">{ACTION_TEXT[h.action] || h.action}</p>
                    {h.detail && <p className="text-sm text-ink-600">{h.detail}</p>}
                    <p className="text-xs text-ink-400">
                      {formatDateTime(h.created_at, company.timezone)}
                      {h.actor_name && ` · ${h.actor_name}`}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <EditModal
        booking={b}
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          booking.setData(updated)
          history.reload()
          setEditing(false)
          toast(updated.clashes?.length ? `Saved. Warning: ${updated.clashes.length} possible clash(es).` : 'Booking updated', updated.clashes?.length ? 'warning' : undefined)
        }}
      />
    </>
  )
}
