// M1 · Bookings & Live Event Board — owner: Abdullah Iftikhar Abbasi
import { useState } from 'react'
import { Link, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { Alert, Button, Card, CONTROL, CONTROL_INLINE, EmptyState, PageHeader, Skeleton, Tabs, useToast } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, errorText } from '../../lib/api.js'
import { addDays, formatDate, formatMoney, formatNumber, timeRange, todayIn } from '../../lib/format.js'
import { query, useApi } from '../../lib/useApi.js'
import { BookingDetail } from './BookingDetail.jsx'
import { EDIT_ROLES, EVENT_LABEL, STATUS } from './constants.js'
import { NewBooking } from './NewBooking.jsx'
import { Meta, ProgressTrack, Stat, StatusBadge } from './parts.jsx'

export function BookingsPage() {
  return (
    <Routes>
      <Route index element={<BookingsHome />} />
      <Route path="new" element={<NewBooking />} />
      <Route path=":id" element={<BookingDetail />} />
    </Routes>
  )
}

function BookingsHome() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'live'
  const summary = useApi('/bookings/summary')
  const canEdit = EDIT_ROLES.includes(user.role)
  const s = summary.data
  return (
    <>
      <PageHeader
        context="M1 · Bookings & Events"
        title="Bookings"
        description="Every booking from first inquiry to the last plate packed, and a live board for today's events."
      />
      <div className="-mt-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Today" value={s ? s.today : '–'} hint="events going ahead" />
          <Stat label="Next 7 days" value={s ? s.next_7_days : '–'} hint="booked events" />
          <Stat label="Open inquiries" value={s ? (s.by_status.inquiry || 0) + (s.by_status.quoted || 0) : '–'} tone="text-brand-700" hint="inquiry or quoted" />
          <Stat label="Confirmed" value={s ? s.by_status.confirmed || 0 : '–'} tone="text-kashi-700" hint="waiting for the day" />
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Tabs
          value={tab}
          onChange={(id) => setParams({ tab: id }, { replace: true })}
          tabs={[
            { id: 'live', label: 'Live board', icon: 'play' },
            { id: 'all', label: 'All bookings', icon: 'calendar' },
          ]}
        />
        {canEdit && (
          <Link
            to="/bookings/new"
            className="inline-flex h-10 items-center gap-2 rounded-[0.65rem] bg-brand-600 px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(20,27,66,0.25)] transition-colors hover:bg-brand-700"
          >
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
            New booking
          </Link>
        )}
      </div>
      {tab === 'live' ? <LiveBoard onChanged={summary.reload} /> : <BookingList />}
    </>
  )
}

function LiveBoard({ onChanged }) {
  const { company } = useAuth()
  const toast = useToast()
  const today = todayIn(company.timezone)
  const [day, setDay] = useState(today)
  const { data, setData, error, loading } = useApi(`/bookings/live${query({ on: day })}`, { refreshMs: 30000 })
  const [busy, setBusy] = useState(null)

  async function step(booking, progress) {
    setBusy(booking.id)
    try {
      const updated = await api(`/bookings/${booking.id}/progress`, { method: 'POST', body: { progress } })
      setData((list) => list.map((b) => (b.id === updated.id ? updated : b)))
      onChanged?.()
    } catch (err) {
      toast(errorText(err), 'danger')
    } finally {
      setBusy(null)
    }
  }

  const guests = (data || []).reduce((sum, b) => sum + b.guest_count, 0)
  return (
    <div className="animate-page-in">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">
          <Icon name="arrowLeft" className="h-4 w-4" />
        </Button>
        <input type="date" className={`${CONTROL_INLINE} w-44 py-1.5`} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Day" />
        <Button variant="secondary" size="sm" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">
          <Icon name="chevronRight" className="h-4 w-4" />
        </Button>
        {day !== today && (
          <Button variant="ghost" size="sm" onClick={() => setDay(today)}>
            Today
          </Button>
        )}
        <p className="ml-auto text-sm text-ink-500">
          {formatDate(day, { year: true })}
          {data && data.length > 0 && <> · {data.length} events · {formatNumber(guests)} guests</>}
          {day === today && <span className="ml-2 inline-flex items-center gap-1 text-kashi-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kashi-500" />Live</span>}
        </p>
      </div>
      <Alert>{error}</Alert>
      {loading && !data && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-panel" />
          ))}
        </div>
      )}
      {data && data.length === 0 && (
        <EmptyState title="No events on this day" icon="calendar">
          Confirmed bookings for {formatDate(day)} will appear here, so the team can follow each event as it happens.
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((b) => (
            <article key={b.id} className="rounded-panel bg-white p-5 shadow-glaze ring-1 ring-ink-200/70 transition-shadow hover:shadow-pop">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="tabular text-sm font-semibold text-brand-700">{timeRange(b.start_time, b.end_time)}</p>
                  <Link to={`/bookings/${b.id}`} className="mt-0.5 block truncate text-lg font-semibold text-ink-900 hover:text-brand-700">
                    {EVENT_LABEL[b.event_type]} · {b.client.name}
                  </Link>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                <Meta icon="pin">{b.venue}</Meta>
                <Meta icon="users">{formatNumber(b.guest_count)} guests</Meta>
                {b.client.phone && <Meta icon="phone">{b.client.phone}</Meta>}
              </div>
              {b.menu && <p className="mt-2 line-clamp-1 text-sm text-ink-500">Menu: {b.menu}</p>}
              <div className="mt-4">
                <ProgressTrack progress={b.progress} busy={busy === b.id} onStep={b.status === 'completed' ? null : (p) => step(b, p)} />
              </div>
            </article>
          ))}
        </div>
      )}
      {data && data.length > 0 && <p className="mt-4 text-xs text-ink-400">Tap a step to update an event. The board refreshes every 30 seconds.</p>}
    </div>
  )
}

function BookingList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ q: '', status: '', date_from: '', date_to: '' })
  const [q, setQ] = useState('')
  const { data, error, loading } = useApi(`/bookings${query({ ...filters, q })}`)
  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value })

  return (
    <Card bodyClassName="" className="animate-page-in">
      <div className="flex flex-wrap gap-3 border-b border-ink-100 px-5 py-4 sm:px-6">
        <div className="relative min-w-[12rem] flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            className={`${CONTROL} py-2 pl-9`}
            placeholder="Client, venue or phone"
            aria-label="Search bookings"
            defaultValue={q}
            onKeyDown={(e) => e.key === 'Enter' && setQ(e.currentTarget.value)}
            onBlur={(e) => setQ(e.currentTarget.value)}
          />
        </div>
        <div className="relative w-40">
          <select className={`${CONTROL} appearance-none py-2 pr-9`} value={filters.status} onChange={set('status')} aria-label="Status">
            <option value="">All statuses</option>
            {Object.entries(STATUS).map(([id, s]) => (
              <option key={id} value={id}>
                {s.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        </div>
        <input type="date" className={`${CONTROL_INLINE} w-40 py-2`} value={filters.date_from} onChange={set('date_from')} aria-label="From date" />
        <input type="date" className={`${CONTROL_INLINE} w-40 py-2`} value={filters.date_to} onChange={set('date_to')} aria-label="To date" />
      </div>
      {error && (
        <div className="p-5">
          <Alert>{error}</Alert>
        </div>
      )}
      {loading && !data && (
        <div className="space-y-3 p-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {data && data.length === 0 && <p className="px-6 py-12 text-center text-sm text-ink-500">No bookings match these filters.</p>}
      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Client & event</th>
                <th className="px-3 py-3 font-medium">Venue</th>
                <th className="px-3 py-3 text-right font-medium">Guests</th>
                <th className="px-3 py-3 text-right font-medium">Quote</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.map((b) => (
                <tr key={b.id} onClick={() => navigate(`/bookings/${b.id}`)} className="cursor-pointer transition-colors hover:bg-brand-50/50">
                  <td className="whitespace-nowrap px-6 py-3.5">
                    <p className="font-medium text-ink-900">{formatDate(b.event_date, { year: true })}</p>
                    <p className="tabular text-xs text-ink-500">{timeRange(b.start_time, b.end_time)}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <Link to={`/bookings/${b.id}`} className="font-semibold text-ink-900 hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
                      {b.client.name}
                    </Link>
                    <p className="text-xs text-ink-500">{EVENT_LABEL[b.event_type]}</p>
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-3.5 text-ink-600">{b.venue}</td>
                  <td className="tabular px-3 py-3.5 text-right text-ink-700">{formatNumber(b.guest_count)}</td>
                  <td className="tabular px-3 py-3.5 text-right text-ink-700">{formatMoney(b.quoted_amount)}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
