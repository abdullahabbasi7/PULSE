import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Avatar, Badge, Button, Card, Field, PageHeader, PasswordStrength, useToast } from '../components/ui/index.js'
import { api, errorText } from '../lib/api.js'
import { isStrong } from '../lib/passwordRules.js'
import { ROLE_LABELS } from '../lib/roles.js'

const EMPTY = { current: '', next: '', confirm: '' }

export function AccountPage() {
  const { user, company, replaceTokens } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const strong = isStrong(form.next, { email: user.email, fullName: user.full_name })
  const matches = form.confirm.length > 0 && form.confirm === form.next

  async function submit(event) {
    event.preventDefault()
    setError('')
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
      <PageHeader title="Your account" description="Your sign-in details for this workspace." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={user.full_name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-ink-900">{user.full_name}</p>
              <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>
            </div>
          </div>
          <dl className="mt-6 divide-y divide-ink-100 text-sm">
            {[
              ['Company', company.name],
              ['Email', user.email],
              ['Mobile number', user.phone || 'Not added'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-ink-500">{label}</dt>
                <dd className="truncate text-right font-medium text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs leading-relaxed text-ink-400">
            You can sign in with your email{user.phone ? ' or your mobile number' : ''}. To change these, ask your company owner.
          </p>
        </Card>

        <Card title="Change password" description="Use a password you don't use anywhere else.">
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Field id="current" label="Current password" type="password" autoComplete="current-password" value={form.current} onChange={update('current')} />
            <div>
              <Field id="next" label="New password" type="password" autoComplete="new-password" value={form.next} onChange={update('next')} />
              <PasswordStrength password={form.next} email={user.email} fullName={user.full_name} onSuggest={(pw) => setForm((f) => ({ ...f, next: pw, confirm: pw }))} />
            </div>
            <Field
              id="confirm"
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
