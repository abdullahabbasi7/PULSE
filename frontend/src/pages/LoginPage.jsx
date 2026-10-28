import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Button, Field } from '../components/ui/index.js'
import { ApiError, errorText } from '../lib/api.js'
import { AuthShell } from './AuthShell.jsx'

export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState({ text: '', tone: 'danger' })
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setError({ text: '', tone: 'danger' })
    if (!form.identifier.trim() || !form.password) {
      setError({ text: 'Enter your email or mobile number and your password.', tone: 'danger' })
      return
    }
    setBusy(true)
    try {
      await login(form.identifier.trim(), form.password)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      const locked = err instanceof ApiError && (err.status === 423 || err.status === 403)
      setError({ text: errorText(err), tone: locked ? 'warning' : 'danger' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with the email or mobile number your company registered for you."
      footer={
        <>
          New to PULSE?{' '}
          <Link to="/signup" className="font-semibold text-brand-700 underline-offset-4 transition-colors hover:text-brand-800 hover:underline">
            Request a workspace for your company
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <Field
          id="identifier"
          label="Email or mobile number"
          autoComplete="username"
          placeholder="you@company.com or 0300 1234567"
          required
          value={form.identifier}
          onChange={update('identifier')}
        />
        <Field id="password" label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={update('password')} />
        <Alert key={error.text} tone={error.tone}>{error.text}</Alert>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
        <p className="text-center text-xs leading-relaxed text-ink-400">
          Accounts are created by your company&apos;s owner or manager. After 5 wrong passwords an account is locked for 15 minutes.
        </p>
        <p className="text-center text-xs text-ink-400">
          PULSE team?{' '}
          <Link to="/platform/login" className="font-medium text-ink-500 underline-offset-4 hover:text-brand-700 hover:underline">
            Platform console sign-in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
