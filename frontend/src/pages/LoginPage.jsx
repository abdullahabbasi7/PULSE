import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Button, Field } from '../components/ui/index.js'
import { errorText } from '../lib/api.js'
import { AuthShell } from './AuthShell.jsx'

export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(form.email.trim(), form.password)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use the account your company gave you."
      footer={
        <>
          New company?{' '}
          <Link to="/signup" className="font-medium text-brand-700 hover:underline">
            Create a workspace
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={update('password')}
        />
        <Alert>{error}</Alert>
        <Button type="submit" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}
