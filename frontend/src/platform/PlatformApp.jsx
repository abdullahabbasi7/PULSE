// PULSE platform console: the PULSE team approves, rejects and suspends companies.
// It has its own sign-in and token, separate from company accounts.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Alert, Badge, Button, Card, EmptyState, Field, Modal, PasswordStrength, Reveal, SelectField, Skeleton, Tabs, useFormGuard, useToast } from '../components/ui/index.js'
import { isStrong } from '../lib/passwordRules.js'
import { Icon, PulseLogo } from '../layout/icons.jsx'
import { formatDateTime } from '../lib/format.js'
import { EventBackdrop } from '../components/EventBackdrop.jsx'

const KEY = 'pulse.platform'
const BASE = '/api/v1/platform'

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}
function setSession(value) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage unavailable: the session lasts for this tab only.
  }
}

async function call(path, { method = 'GET', body } = {}) {
  const session = getSession()
  const headers = { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(session ? { Authorization: `Bearer ${session.token}` } : {}) }
  let response
  try {
    response = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new Error('Cannot reach the PULSE server.')
  }
  const data = await response.json().catch(() => null)
  if (response.status === 401 && path !== '/login') {
    setSession(null)
    window.dispatchEvent(new Event('pulse:platform-logout'))
  }
  if (!response.ok) {
    const detail = data?.detail
    throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d) => d.msg).join(' ') : 'Something went wrong.')
  }
  return data
}

const STATUS = {
  pending: { label: 'Waiting for review', tone: 'warning' },
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'danger' },
  rejected: { label: 'Rejected', tone: 'neutral' },
}

function PlatformLogin() {
  const navigate = useNavigate()
  const guard = useFormGuard()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (getSession()) return <Navigate to="/platform" replace />

  async function submit(event) {
    event.preventDefault()
    if (!guard(event.currentTarget)) return
    setBusy(true)
    setError('')
    try {
      const res = await call('/login', { method: 'POST', body: form })
      setSession({ token: res.access_token, admin: res.admin })
      navigate('/platform', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
      <EventBackdrop className="z-0" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div>
            <PulseLogo tagline={false} />
            <p className="mt-1 pl-[3.25rem] text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Platform console</p>
          </div>
        </div>
        <Card>
          <h1 className="font-display text-2xl text-ink-900">Platform team sign-in</h1>
          <p className="mt-1 text-sm text-ink-500">For PULSE staff who review company requests. Company users sign in on the main page.</p>
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Field id="p_email" kind="email" required label="Email" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Field id="p_password" required label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Alert key={error}>{error}</Alert>
            <Button type="submit" className="w-full" loading={busy} disabled={!form.email || !form.password}>
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

function ReasonModal({ action, onClose, onConfirm }) {
  const guard = useFormGuard()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => setNote(''), [action])
  if (!action) return null
  const verb = action.status === 'rejected' ? 'Reject' : 'Suspend'
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`${verb} ${action.company.name}?`}
      description={
        action.status === 'rejected'
          ? 'The owner will see this reason when they try to sign in.'
          : 'Everyone in this company is signed out at once and cannot sign in until you reactivate it.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            loading={busy}
            disabled={note.trim().length < 3}
            onClick={async () => {
              if (!guard()) return
              setBusy(true)
              await onConfirm(note.trim())
              setBusy(false)
            }}
          >
            {verb}
          </Button>
        </>
      }
    >
      <Field id="reason" kind="words" required label="Reason" placeholder={action.status === 'rejected' ? 'e.g. Could not verify the business' : 'e.g. Subscription unpaid'} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  )
}

function CompanyCard({ c, busy, onDecide, onAsk }) {
  const s = STATUS[c.status]
  return (
    <div className="rounded-panel bg-white p-5 shadow-glaze ring-1 ring-ink-200/70 transition-shadow hover:shadow-pop">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-ink-900">{c.name}</h3>
            <Badge tone={s.tone} dot>{s.label}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-ink-500">
            {[c.city, c.timezone.replace(/_/g, ' '), `requested ${formatDateTime(c.created_at)}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.status === 'pending' && (
            <>
              <Button loading={busy} onClick={() => onDecide(c, 'active')}>
                <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
                Approve
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => onAsk(c, 'rejected')}>Reject</Button>
            </>
          )}
          {c.status === 'active' && <Button variant="danger" disabled={busy} onClick={() => onAsk(c, 'suspended')}>Suspend</Button>}
          {c.status === 'suspended' && <Button loading={busy} onClick={() => onDecide(c, 'active')}>Reactivate</Button>}
          {c.status === 'rejected' && <Button variant="secondary" loading={busy} onClick={() => onDecide(c, 'active')}>Approve after all</Button>}
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Owner</dt>
          <dd className="mt-0.5 font-medium text-ink-900">{c.owner_name || '—'}</dd>
          <dd className="text-ink-600">{c.owner_email}{c.owner_phone && ` · ${c.owner_phone}`}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Accounts</dt>
          <dd className="tabular mt-0.5 font-medium text-ink-900">{c.members}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Bookings</dt>
          <dd className="tabular mt-0.5 font-medium text-ink-900">{c.bookings}</dd>
        </div>
      </dl>
      {c.reviewed_at && (
        <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
          Last decision {formatDateTime(c.reviewed_at)}
          {c.reviewed_by_name && ` by ${c.reviewed_by_name}`}
          {c.review_note && <> · <span className="text-ink-700">{c.review_note}</span></>}
        </p>
      )}
    </div>
  )
}

const ZONES = ['Asia/Karachi', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Kuala_Lumpur', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'Europe/Istanbul', 'Africa/Cairo', 'Africa/Nairobi', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Toronto', 'Australia/Sydney', 'UTC']
const NEW_COMPANY = { company_name: '', city: '', timezone: 'Asia/Karachi', phone: '', owner_name: '', owner_email: '', owner_mobile: '', owner_password: '' }

// The PULSE team adds a company itself (e.g. after a phone call). It is active at once.
function AddCompanyModal({ open, onClose, onAdded }) {
  const guard = useFormGuard()
  const [form, setForm] = useState(NEW_COMPANY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  useEffect(() => {
    if (open) {
      setForm(NEW_COMPANY)
      setError('')
    }
  }, [open])

  async function save() {
    if (!guard()) return
    if (!isStrong(form.owner_password, { email: form.owner_email, fullName: form.owner_name })) {
      setError('Choose a stronger password, or press "Suggest a strong password".')
      return
    }
    setBusy(true)
    setError('')
    try {
      const body = { ...form, city: form.city.trim() || null, phone: form.phone.trim() || null, company_name: form.company_name.trim(), owner_name: form.owner_name.trim(), owner_email: form.owner_email.trim() }
      const company = await call('/companies', { method: 'POST', body })
      onAdded(company, { email: body.owner_email, mobile: form.owner_mobile.trim(), password: form.owner_password })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="building"
      title="Add a company"
      description="The company is approved straight away. Its owner signs in with the email or mobile number and the password you set here."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>
            <Icon name="plus" className="h-4 w-4" />
            Add company
          </Button>
        </>
      }
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Company</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ac_name" kind="companyName" required label="Company name" placeholder="e.g. Royal Caterers" value={form.company_name} onChange={set('company_name')} className="sm:col-span-2" />
        <Field id="ac_city" kind="place" label="City" placeholder="e.g. Lahore" value={form.city} onChange={set('city')} />
        <SelectField id="ac_tz" label="Time zone" options={ZONES.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))} value={form.timezone} onChange={set('timezone')} />
        <Field id="ac_phone" kind="phone" label="Company phone (optional)" type="tel" value={form.phone} onChange={set('phone')} />
      </div>
      <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-ink-400">Owner's sign-in</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ac_owner" kind="personName" required label="Owner's full name" value={form.owner_name} onChange={set('owner_name')} className="sm:col-span-2" />
        <Field id="ac_email" kind="email" required label="Owner's email" type="email" value={form.owner_email} onChange={set('owner_email')} />
        <Field id="ac_mobile" kind="phone" required label="Owner's mobile number" type="tel" placeholder="0300 1234567" value={form.owner_mobile} onChange={set('owner_mobile')} />
        <div className="sm:col-span-2">
          <Field id="ac_password" required label="Password for the owner" type="text" autoComplete="new-password" value={form.owner_password} onChange={set('owner_password')} />
          <PasswordStrength password={form.owner_password} email={form.owner_email} fullName={form.owner_name} onSuggest={(pw) => setForm((f) => ({ ...f, owner_password: pw }))} />
        </div>
      </div>
      <div className="mt-4">
        <Alert key={error}>{error}</Alert>
      </div>
    </Modal>
  )
}

// Shown once after adding a company, so the admin can pass the sign-in details on.
function SignInDetailsModal({ details, onClose }) {
  const toast = useToast()
  if (!details) return null
  const text = `PULSE workspace for ${details.company}\nSign in at: ${window.location.origin}/login\nEmail: ${details.email}\nMobile: ${details.mobile}\nPassword: ${details.password}\nPlease change this password after your first sign-in (Account page).`
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      toast('Sign-in details copied')
    } catch {
      toast('Could not copy. Select the text and copy it yourself.', 'danger')
    }
  }
  return (
    <Modal
      open={Boolean(details)}
      onClose={onClose}
      icon="check"
      title={`${details.company} is ready`}
      description="Send these details to the owner. The password is shown only now."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Done</Button>
          <Button onClick={copy}>
            <Icon name="copy" className="h-4 w-4" />
            Copy details
          </Button>
        </>
      }
    >
      <dl className="space-y-3 rounded-xl bg-ink-50 p-4 text-sm ring-1 ring-inset ring-ink-200/70">
        {[
          ['Sign-in page', `${window.location.origin}/login`],
          ['Email', details.email],
          ['Mobile number', details.mobile],
          ['Password', details.password],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-ink-500">{k}</dt>
            <dd className="break-all font-mono font-medium text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-500">The owner can change the password later from the Account page, and add managers, staff, drivers and accounts users from Team.</p>
    </Modal>
  )
}

function PlatformHome() {
  const navigate = useNavigate()
  const toast = useToast()
  const session = getSession()
  const [companies, setCompanies] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('pending')
  const [busy, setBusy] = useState(null)
  const [asking, setAsking] = useState(null)
  const [adding, setAdding] = useState(false)
  const [details, setDetails] = useState(null)

  const load = useCallback(async () => {
    try {
      setCompanies(await call('/companies'))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
    const onLogout = () => navigate('/platform/login', { replace: true })
    window.addEventListener('pulse:platform-logout', onLogout)
    return () => window.removeEventListener('pulse:platform-logout', onLogout)
  }, [load, navigate])

  const counts = useMemo(() => {
    const c = { pending: 0, active: 0, suspended: 0, rejected: 0 }
    ;(companies || []).forEach((x) => (c[x.status] += 1))
    return c
  }, [companies])

  if (!session) return <Navigate to="/platform/login" replace />

  async function decide(company, status, note) {
    setBusy(company.id)
    try {
      const updated = await call(`/companies/${company.id}/decision`, { method: 'POST', body: { status, note } })
      setCompanies((list) => list.map((c) => (c.id === updated.id ? updated : c)))
      toast(
        status === 'active'
          ? `${company.name} is active. Its owner can sign in now.`
          : status === 'rejected'
            ? `${company.name} was rejected.`
            : `${company.name} is suspended.`,
      )
      setAsking(null)
    } catch (err) {
      toast(err.message, 'danger')
    } finally {
      setBusy(null)
    }
  }

  const visible = (companies || []).filter((c) => c.status === tab)
  return (
    <div className="relative min-h-screen bg-ink-50">
      <EventBackdrop className="z-0" lightsTop={60} />
      <header className="relative z-10 border-b border-ink-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <PulseLogo tagline={false} />
            <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">Platform console</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-600 sm:block">{session.admin.full_name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSession(null)
                navigate('/platform/login', { replace: true })
              }}
            >
              <Icon name="logout" className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-ink-900">Companies</h1>
            <p className="mt-1 text-sm text-ink-500">Approve sign-up requests, or add a company yourself. Suspending a company signs all its users out.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={load}>
              <Icon name="refresh" className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Icon name="plus" className="h-4 w-4" />
              Add company
            </Button>
          </div>
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'pending', label: 'Waiting', icon: 'clock', count: counts.pending },
            { id: 'active', label: 'Active', icon: 'check', count: counts.active },
            { id: 'suspended', label: 'Suspended', icon: 'lock', count: counts.suspended },
            { id: 'rejected', label: 'Rejected', icon: 'close', count: counts.rejected },
          ]}
        />
        <Alert>{error}</Alert>
        {!companies && !error && <Skeleton className="h-40 w-full rounded-panel" />}
        {companies && visible.length === 0 && (
          <EmptyState title={tab === 'pending' ? 'No requests waiting' : `No ${tab} companies`} icon="building">
            {tab === 'pending' ? 'New sign-ups appear here for review.' : null}
          </EmptyState>
        )}
        <ul className="animate-page-in space-y-4">
          {visible.map((c, i) => (
            <Reveal as="li" key={c.id} delay={i * 80} className="list-none">
            <CompanyCard c={c} busy={busy === c.id} onDecide={(co, st) => decide(co, st)} onAsk={(co, st) => setAsking({ company: co, status: st })} />
            </Reveal>
          ))}
        </ul>
      </main>
      <ReasonModal action={asking} onClose={() => setAsking(null)} onConfirm={(note) => decide(asking.company, asking.status, note)} />
      <AddCompanyModal
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(company, login) => {
          setCompanies((list) => [company, ...(list || [])])
          setAdding(false)
          setTab('active')
          setDetails({ company: company.name, ...login })
          toast(`${company.name} added and active`)
        }}
      />
      <SignInDetailsModal details={details} onClose={() => setDetails(null)} />
    </div>
  )
}

export function PlatformApp() {
  return (
    <Routes>
      <Route path="login" element={<PlatformLogin />} />
      <Route index element={<PlatformHome />} />
      <Route path="*" element={<Navigate to="/platform" replace />} />
    </Routes>
  )
}
