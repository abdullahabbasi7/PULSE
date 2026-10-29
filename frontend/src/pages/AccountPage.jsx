import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Avatar, Badge, Button, Card, Field, PageHeader, PasswordStrength, useFormGuard, useToast } from '../components/ui/index.js'
import { Icon } from '../layout/icons.jsx'
import { api, errorText } from '../lib/api.js'
import { isStrong } from '../lib/passwordRules.js'
import { ROLE_LABELS } from '../lib/roles.js'

const EMPTY = { current: '', next: '', confirm: '' }

// Shrinks a chosen photo in the browser (longest side 800px) so uploads stay quick.
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      reject(new Error('Choose a JPEG, PNG or WebP image.'))
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error('That image is over 15 MB. Choose a smaller one.'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 800 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be opened as an image.'))
    }
    img.src = url
  })
}

function ProfileCard() {
  const { user, company, reload } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)
  const guard = useFormGuard()
  const [form, setForm] = useState({ full_name: user.full_name, phone: user.phone || '', job_title: user.job_title || '' })
  const [photo, setPhoto] = useState(undefined) // undefined: unchanged, '': remove, data URL: new
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const preview = photo === undefined ? user.avatar : photo || null
  const dirty =
    photo !== undefined || form.full_name !== user.full_name || form.phone !== (user.phone || '') || form.job_title !== (user.job_title || '')

  async function choose(file) {
    if (!file) return
    setError('')
    try {
      setPhoto(await readPhoto(file))
    } catch (err) {
      setError(err.message)
    }
  }

  async function save(event) {
    event.preventDefault()
    if (!guard(event.currentTarget)) return
    setBusy(true)
    setError('')
    try {
      const body = { full_name: form.full_name.trim(), phone: form.phone.trim() || null, job_title: form.job_title.trim() }
      if (photo !== undefined) body.avatar = photo
      await api('/auth/me', { method: 'PATCH', body })
      await reload()
      setPhoto(undefined)
      toast('Profile saved')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Your profile" description="Your photo and details appear to your team across PULSE.">
      <form onSubmit={save} noValidate className="space-y-5">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              choose(e.dataTransfer.files?.[0])
            }}
            className={`group relative shrink-0 rounded-full transition-transform duration-300 hover:scale-105 ${dragging ? 'scale-105 ring-4 ring-brand-300' : ''}`}
            aria-label="Change profile photo"
          >
            <Avatar name={form.full_name || user.full_name} src={preview} size="xl" className="shadow-glaze" />
            <span className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-ink-900/45 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Icon name="camera" className="mb-0.5 h-5 w-5" />
              Change
            </span>
          </button>
          <div className="min-w-0 space-y-2">
            <p className="text-sm text-ink-600">Click the photo or drop an image on it. A square crop of the centre is used.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Icon name="camera" className="h-4 w-4" />
                Upload photo
              </Button>
              {preview && (
                <Button variant="ghost" size="sm" onClick={() => setPhoto('')}>
                  <Icon name="trash" className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              choose(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="p_name" kind="personName" required label="Full name" value={form.full_name} onChange={set('full_name')} className="sm:col-span-2" />
          <Field id="p_title" kind="title" label="Job title" placeholder="e.g. Operations manager" value={form.job_title} onChange={set('job_title')} />
          <Field id="p_phone" kind="phone" label="Mobile number" type="tel" placeholder="0300 1234567" value={form.phone} onChange={set('phone')} hint="You can sign in with this number." />
        </div>

        <dl className="divide-y divide-ink-100 rounded-xl bg-ink-50 px-4 text-sm ring-1 ring-inset ring-ink-200/70">
          {[
            ['Role', <Badge key="r" tone="brand">{ROLE_LABELS[user.role]}</Badge>],
            ['Company', company.name],
            ['Email', user.email],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-500">{label}</dt>
              <dd className="truncate text-right font-medium text-ink-900">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="-mt-2 text-xs text-ink-400">Your email and role are managed by your company owner.</p>

        <Alert key={error}>{error}</Alert>
        <Button type="submit" loading={busy} disabled={!dirty || form.full_name.trim().length < 2}>
          Save profile
        </Button>
      </form>
    </Card>
  )
}

export function AccountPage() {
  const { user, replaceTokens } = useAuth()
  const toast = useToast()
  const guard = useFormGuard()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const strong = isStrong(form.next, { email: user.email, fullName: user.full_name })
  const matches = form.confirm.length > 0 && form.confirm === form.next

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!guard(event.currentTarget)) return
    setBusy(true)
    try {
      const tokens = await api('/auth/change-password', {
        method: 'POST',
        body: { current_password: form.current, new_password: form.next },
      })
      replaceTokens(tokens)
      setForm(EMPTY)
      toast('Password changed. Other devices have been signed out.')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Your account" description="Your profile, photo and sign-in details for this workspace." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ProfileCard />

        <Card title="Change password" description="Use a password you don't use anywhere else.">
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Field id="current" required label="Current password" type="password" autoComplete="current-password" value={form.current} onChange={update('current')} />
            <div>
              <Field id="next" required label="New password" type="password" autoComplete="new-password" value={form.next} onChange={update('next')} />
              <PasswordStrength password={form.next} email={user.email} fullName={user.full_name} onSuggest={(pw) => setForm((f) => ({ ...f, next: pw, confirm: pw }))} />
            </div>
            <Field
              id="confirm" required
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={update('confirm')}
              error={form.confirm && !matches ? 'The passwords do not match.' : undefined}
            />
            <Alert key={error}>{error}</Alert>
            <Button type="submit" loading={busy} disabled={!form.current || !strong || !matches}>
              Change password
            </Button>
          </form>
        </Card>
      </div>
    </>
  )
}
