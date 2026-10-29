import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Button, Field, PasswordStrength, useFormGuard } from '../components/ui/index.js'
import { Icon } from '../layout/icons.jsx'
import { errorText } from '../lib/api.js'
import { isStrong } from '../lib/passwordRules.js'
import { AuthShell } from './AuthShell.jsx'

const EMPTY = { company_name: '', city: '', phone: '', owner_name: '', email: '', mobile: '', password: '', confirm: '' }

function Group({ title, children, delay = 0 }) {
  return (
    <fieldset className="animate-page-in space-y-4" style={{ animationDelay: `${delay}ms` }}>
      <legend className="mb-4 text-sm font-semibold text-ink-900">{title}</legend>
      {children}
    </fieldset>
  )
}

function RequestSent({ result, email }) {
  return (
    <AuthShell
      title="Request sent"
      subtitle={`Thank you. We've received the request for ${result.company_name}.`}
      footer={
        <Link to="/login" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="animate-fade-in space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-kashi-50 p-5 ring-1 ring-inset ring-kashi-200">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kashi-500 text-white">
            <Icon name="check" className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <p className="text-sm leading-relaxed text-ink-700">{result.message}</p>
        </div>
        <ol className="space-y-3 text-sm text-ink-600">
          {[
            'The PULSE team checks your company details.',
            `Once approved, sign in with ${email || 'your email'} or your mobile number and the password you chose.`,
            'Then add your team and start taking bookings.',
          ].map((text, i) => (
            <li key={i} className="flex gap-3">
              <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-ink-500 ring-1 ring-ink-300">{i + 1}</span>
              <span className="pt-0.5">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </AuthShell>
  )
}

export function SignupPage() {
  const { status, signup } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [sent, setSent] = useState(null)
  const guard = useFormGuard()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  if (sent) return <RequestSent result={sent} email={form.email} />

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const context = { email: form.email, fullName: form.owner_name }
  const strong = isStrong(form.password, context)
  const matches = form.confirm.length > 0 && form.confirm === form.password

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!guard(event.currentTarget)) return
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
      const result = await signup({
        company_name: form.company_name.trim(),
        owner_name: form.owner_name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
      })
      setSent(result)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Request a workspace"
      subtitle="Tell us about your company. The PULSE team reviews every request, and you can sign in as the owner once it is approved."
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
        <Group title="Your company" delay={120}>
          <Field id="company_name" kind="companyName" label="Company name" placeholder="e.g. Royal Caterers" required value={form.company_name} onChange={update('company_name')} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="city" kind="place" label="City" placeholder="Your city" value={form.city} onChange={update('city')} />
            <Field id="phone" kind="phone" label="Office phone" type="tel" placeholder="Optional" value={form.phone} onChange={update('phone')} />
          </div>
        </Group>
        <Group title="Your owner account" delay={240}>
          <Field id="owner_name" kind="personName" label="Full name" autoComplete="name" required value={form.owner_name} onChange={update('owner_name')} />
          <Field id="email" kind="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
          <Field
            id="mobile" kind="phone"
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
            <PasswordStrength password={form.password} email={form.email} fullName={form.owner_name} onSuggest={(pw) => setForm((f) => ({ ...f, password: pw, confirm: pw }))} />
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
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send request
          </Button>
          <p className="text-center text-xs leading-relaxed text-ink-400">Nothing is set up until your request is approved. Reviews usually take one working day.</p>
        </div>
      </form>
    </AuthShell>
  )
}
