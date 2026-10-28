import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { Alert, Badge, Button, Card, CONTROL, EmptyState, Field, PageHeader, SelectField, useToast } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, errorText } from '../../lib/api.js'
import { formatDate, percent, timeRange } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { EDIT_ROLES, ENTITY_STYLE, EVENT_LABEL, EVENT_TYPES } from './constants.js'

const EMPTY = {
  client_mode: 'new',
  client_id: '',
  client_name: '',
  client_phone: '',
  event_type: 'wedding',
  event_date: '',
  start_time: '',
  end_time: '',
  venue: '',
  guest_count: '',
  menu: '',
  package: '',
  quoted_amount: '',
  notes: '',
  status: 'inquiry',
}

const SAMPLES = [
  'Assalam o alaikum, beti ki mehndi hai 14 november ko, 350 mehman, Marquee Grand, biryani aur kheer chahiye. 0321 4567890',
  'Hi, we need catering for our annual corporate dinner on 5th December at 7:30 pm, around 120 people at Serena Hotel. Menu: chicken karahi, naan, salad and gulab jamun.',
  'walima next friday raat 8 baje, takreeban 2 sau log, venue Royal Palm lawn, mutton qorma, zarda, raita',
]

function Highlighted({ text, entities }) {
  const parts = []
  let at = 0
  ;[...entities]
    .sort((a, b) => a.start - b.start)
    .forEach((e, i) => {
      if (e.start < at) return
      if (e.start > at) parts.push(<span key={`t${i}`}>{text.slice(at, e.start)}</span>)
      const style = ENTITY_STYLE[e.label] || { cls: 'bg-ink-100', label: e.label }
      parts.push(
        <mark key={`e${i}`} className={`rounded-md px-1 py-0.5 ring-1 ring-inset ${style.cls}`} title={`${style.label} · ${percent(e.confidence)} sure`}>
          {text.slice(e.start, e.end)}
          <sup className="ml-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-70">{style.label}</sup>
        </mark>,
      )
      at = e.end
    })
  if (at < text.length) parts.push(<span key="end">{text.slice(at)}</span>)
  return <p className="whitespace-pre-wrap text-sm leading-7 text-ink-800">{parts}</p>
}

function InquiryPanel({ onApply }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function read() {
    setError('')
    setBusy(true)
    try {
      const parsed = await api('/bookings/parse-inquiry', { method: 'POST', body: { text } })
      setResult({ ...parsed, text })
      onApply(parsed, text)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const found = result
    ? [
        ['Event', `${EVENT_LABEL[result.event_type]} (${percent(result.event_type_confidence)})`],
        ['Date', result.event_date ? formatDate(result.event_date, { year: true }) : null],
        ['Time', result.start_time ? timeRange(result.start_time) : null],
        ['Guests', result.guest_count],
        ['Venue', result.venue],
        ['Menu', result.menu.length ? result.menu.join(', ') : null],
        ['Phone', result.phone],
      ]
    : []

  return (
    <section className="rounded-panel bg-gradient-to-b from-brand-50 to-white p-5 shadow-glaze ring-1 ring-brand-100 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Icon name="sparkle" className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[0.95rem] font-semibold text-ink-900">AI inquiry reader</h2>
          <p className="text-xs text-ink-500">Paste the client's WhatsApp or email message, in English or Roman Urdu.</p>
        </div>
      </div>
      <textarea
        className={`${CONTROL} mt-4 min-h-[8rem] resize-y leading-relaxed`}
        placeholder="e.g. Assalam o alaikum, shadi ki barat 12 december ko hai, 400 mehman…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Client message"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={read} loading={busy} disabled={text.trim().length < 5}>
          <Icon name="sparkle" className="h-4 w-4" />
          Read message
        </Button>
        <span className="text-xs text-ink-400">Try:</span>
        {SAMPLES.map((sample, i) => (
          <button key={i} type="button" onClick={() => setText(sample)} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 transition-colors hover:bg-brand-50">
            Sample {i + 1}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Alert key={error}>{error}</Alert>
      </div>
      {result && (
        <div className="mt-4 animate-fade-in space-y-4">
          <div className="rounded-xl bg-white p-4 ring-1 ring-ink-200/70">
            <Highlighted text={result.text} entities={result.entities} />
          </div>
          <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            {found.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-500">{label}</dt>
                <dd className={value ? 'font-medium text-ink-900' : 'text-ink-400'}>{value ?? 'Not found, fill in by hand'}</dd>
              </div>
            ))}
          </dl>
          {result.alternatives?.length > 0 && result.event_type_confidence < 0.7 && (
            <p className="text-xs text-saffron-800">
              Not sure about the event type. It could also be {result.alternatives.map((a) => `${EVENT_LABEL[a.event_type]} (${percent(a.confidence)})`).join(' or ')}.
            </p>
          )}
          <p className="text-xs leading-relaxed text-ink-400">
            The form has been filled in. Check every field before saving. Model accuracy on hand-written test messages:{' '}
            {percent(result.model?.handwritten_accuracy, 1)}.
          </p>
        </div>
      )}
    </section>
  )
}

function AiMark({ on }) {
  if (!on) return null
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-brand-50 px-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
      <Icon name="sparkle" className="h-2.5 w-2.5" strokeWidth={2.4} />
      AI
    </span>
  )
}

function Label({ children, ai }) {
  return (
    <span>
      {children}
      <AiMark on={ai} />
    </span>
  )
}

export function NewBooking() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [inquiry, setInquiry] = useState('')
  const [aiFields, setAiFields] = useState({})
  const [clashes, setClashes] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const clients = useApi('/bookings/clients')
  const canEdit = EDIT_ROLES.includes(user.role)

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setAiFields((a) => ({ ...a, [key]: false }))
  }

  function applyAi(parsed, text) {
    const next = {}
    if (parsed.event_type) next.event_type = parsed.event_type
    if (parsed.event_date) next.event_date = parsed.event_date
    if (parsed.start_time) next.start_time = parsed.start_time.slice(0, 5)
    if (parsed.guest_count) next.guest_count = String(parsed.guest_count)
    if (parsed.venue) next.venue = parsed.venue
    if (parsed.menu?.length) next.menu = parsed.menu.join(', ')
    if (parsed.phone && form.client_mode === 'new') next.client_phone = parsed.phone
    setForm((f) => ({ ...f, ...next }))
    setAiFields(Object.fromEntries(Object.keys(next).map((k) => [k, true])))
    setInquiry(text)
  }

  // Live clash check while the date, time or venue changes.
  useEffect(() => {
    if (!form.event_date || form.venue.trim().length < 2) {
      setClashes([])
      return undefined
    }
    const timer = setTimeout(async () => {
      try {
        const found = await api('/bookings/check-clashes', {
          method: 'POST',
          body: { event_date: form.event_date, venue: form.venue.trim(), start_time: form.start_time || null, end_time: form.end_time || null },
        })
        setClashes(found)
      } catch {
        setClashes([])
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [form.event_date, form.venue, form.start_time, form.end_time])

  const clientOptions = useMemo(
    () => [{ value: '', label: 'Choose a client' }, ...(clients.data || []).map((c) => ({ value: c.id, label: c.phone ? `${c.name} · ${c.phone}` : c.name }))],
    [clients.data],
  )

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const body = {
        event_type: form.event_type,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        venue: form.venue.trim(),
        guest_count: Number(form.guest_count),
        menu: form.menu.trim() || null,
        package: form.package.trim() || null,
        quoted_amount: form.quoted_amount === '' ? null : Number(form.quoted_amount),
        notes: form.notes.trim() || null,
        status: form.status,
        inquiry_text: inquiry || null,
      }
      if (form.client_mode === 'existing') body.client_id = form.client_id || null
      else body.client = { name: form.client_name.trim(), phone: form.client_phone.trim() || null }
      const booking = await api('/bookings', { method: 'POST', body })
      toast(`Booking saved for ${booking.client.name}`)
      navigate(`/bookings/${booking.id}`)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (!canEdit) {
    return (
      <EmptyState title="Only owners and managers can take bookings" icon="lock" action={<Link to="/bookings" className="text-sm font-semibold text-brand-700">Back to bookings</Link>} />
    )
  }

  return (
    <>
      <Link to="/bookings?tab=all" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <Icon name="arrowLeft" className="h-4 w-4" />
        Bookings
      </Link>
      <PageHeader title="New booking" description="Paste the client's message to fill the form automatically, or type the details in." />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="xl:sticky xl:top-24">
          <InquiryPanel onApply={applyAi} />
        </div>
        <form onSubmit={submit} noValidate className="space-y-5">
          <Card title="Client">
            <div className="mb-4 inline-flex rounded-xl bg-ink-100 p-1 text-sm font-semibold">
              {[
                ['new', 'New client'],
                ['existing', 'Existing client'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm({ ...form, client_mode: id })}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${form.client_mode === id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.client_mode === 'new' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="client_name" label="Client name" required value={form.client_name} onChange={set('client_name')} />
                <Field id="client_phone" label={<Label ai={aiFields.client_phone}>Phone</Label>} type="tel" value={form.client_phone} onChange={set('client_phone')} />
              </div>
            ) : (
              <SelectField id="client_id" label="Client" options={clientOptions} value={form.client_id} onChange={set('client_id')} />
            )}
          </Card>

          <Card title="Event">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField id="event_type" label={<Label ai={aiFields.event_type}>Event type</Label>} options={EVENT_TYPES} value={form.event_type} onChange={set('event_type')} />
              <Field id="event_date" label={<Label ai={aiFields.event_date}>Date</Label>} type="date" required value={form.event_date} onChange={set('event_date')} />
              <Field id="start_time" label={<Label ai={aiFields.start_time}>Start time</Label>} type="time" value={form.start_time} onChange={set('start_time')} />
              <Field id="end_time" label="End time" type="time" value={form.end_time} onChange={set('end_time')} />
              <Field id="venue" label={<Label ai={aiFields.venue}>Venue</Label>} required value={form.venue} onChange={set('venue')} className="sm:col-span-2" />
              <Field id="guest_count" label={<Label ai={aiFields.guest_count}>Guests</Label>} type="number" min="1" inputMode="numeric" required value={form.guest_count} onChange={set('guest_count')} />
              <Field id="package" label="Package" placeholder="e.g. Silver" value={form.package} onChange={set('package')} />
            </div>
            {clashes.length > 0 && (
              <div className="mt-4 animate-fade-in rounded-xl bg-saffron-50 px-4 py-3 ring-1 ring-inset ring-saffron-200">
                <p className="flex items-center gap-2 text-sm font-semibold text-saffron-900">
                  <Icon name="alert" className="h-4 w-4" />
                  {clashes.length === 1 ? 'Possible clash' : `${clashes.length} possible clashes`}
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-saffron-900">
                  {clashes.map((c) => (
                    <li key={c.booking_id}>
                      <Link to={`/bookings/${c.booking_id}`} className="font-medium underline-offset-2 hover:underline" target="_blank">
                        {EVENT_LABEL[c.event_type]} for {c.client_name}
                      </Link>{' '}
                      at {c.venue}, {timeRange(c.start_time, c.end_time)}. {c.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title="Menu and price">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="menu" className="mb-1.5 block text-sm font-medium text-ink-700">
                  <Label ai={aiFields.menu}>Menu</Label>
                </label>
                <textarea id="menu" className={`${CONTROL} min-h-[4.5rem]`} value={form.menu} onChange={set('menu')} placeholder="Dishes, separated by commas" />
              </div>
              <Field id="quoted_amount" label="Quoted amount" type="number" min="0" inputMode="decimal" value={form.quoted_amount} onChange={set('quoted_amount')} />
              <SelectField
                id="status"
                label="Status"
                options={[
                  { value: 'inquiry', label: 'Inquiry' },
                  { value: 'quoted', label: 'Quoted' },
                  { value: 'confirmed', label: 'Confirmed' },
                ]}
                value={form.status}
                onChange={set('status')}
              />
              <div className="sm:col-span-2">
                <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-ink-700">
                  Notes
                </label>
                <textarea id="notes" className={`${CONTROL} min-h-[4.5rem]`} value={form.notes} onChange={set('notes')} />
              </div>
            </div>
          </Card>

          <Alert key={error}>{error}</Alert>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" loading={busy}>
              Save booking
            </Button>
            {inquiry && <Badge tone="brand">Filled from client message</Badge>}
          </div>
        </form>
      </div>
    </>
  )
}
