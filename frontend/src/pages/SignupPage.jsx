import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Button, Field, PasswordStrength } from '../components/ui/index.js'
import { errorText } from '../lib/api.js'
import { isStrong } from '../lib/passwordRules.js'
import { AuthShell } from './AuthShell.jsx'

const EMPTY = { company_name: '', city: '', phone: '', owner_name: '', email: '', mobile: '', password: '', confirm: '' }

function Group({ title, children }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 text-sm font-semibold text-ink-900">{title}</legend>
      {children}
    </fieldset>
  )
}

export function SignupPage() {
  const { status, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const context = { email: form.email, fullName: form.owner_name }
  const strong = isStrong(form.password, context)
  const matches = form.confirm.length > 0 && form.confirm === form.password

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!strong) {
      setError('Choose a stronger password: it must meet every rule in the checklist.')
      return
    }
    if (!matches) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await signup({
        company_name: form.company_name.trim(),
        owner_name: form.owner_name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Your company gets its own private PULSE. You'll be the owner and can register your team next."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 underline-offset-4 transition-colors hover:text-brand-800 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-8" onSubmit={submit} noValidate>
        <Group title="Your company">
          <Field id="company_name" label="Company name" placeholder="e.g. Royal Caterers" required value={form.company_name} onChange={update('company_name')} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="city" label="City" placeholder="Your city" value={form.city} onChange={update('city')} />
            <Field id="phone" label="Office phone" type="tel" placeholder="Optional" value={form.phone} onChange={update('phone')} />
          </div>
        </Group>
        <Group title="Your owner account">
          <Field id="owner_name" label="Full name" autoComplete="name" required value={form.owner_name} onChange={update('owner_name')} />
          <Field id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
          <Field
            id="mobile"
            label="Mobile number"
            type="tel"
            autoComplete="tel"
            placeholder="0300 1234567 or +44 7700 900123"
            hint="You can sign in with this number or your email."
            required
            value={form.mobile}
            onChange={update('mobile')}
          />
          <div>
            <Field id="password" label="Password" type="password" autoComplete="new-password" required value={form.password} onChange={update('password')} />
            <PasswordStrength password={form.password} email={form.email} fullName={form.owner_name} />
          </div>
          <Field
            id="confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirm}
            onChange={update('confirm')}
            error={form.confirm && !matches ? 'The passwords do not match.' : undefined}
          />
        </Group>
        <div className="space-y-4">
          <Alert key={error}>{error}</Alert>
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!strong || !matches}>
            Create workspace
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}
