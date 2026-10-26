import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Button, Field } from '../components/ui/index.js'
import { errorText } from '../lib/api.js'
import { AuthShell } from './AuthShell.jsx'

const EMPTY = { company_name: '', city: '', phone: '', owner_name: '', email: '', password: '' }

export function SignupPage() {
  const { status, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      await signup({
        company_name: form.company_name.trim(),
        owner_name: form.owner_name.trim(),
        email: form.email.trim(),
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
      title="Create your company workspace"
      subtitle="You become the owner and can add your team afterwards."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field id="company_name" label="Company name" required value={form.company_name} onChange={update('company_name')} />
        <div className="grid grid-cols-2 gap-3">
          <Field id="city" label="City" value={form.city} onChange={update('city')} />
          <Field id="phone" label="Phone" type="tel" value={form.phone} onChange={update('phone')} />
        </div>
        <Field id="owner_name" label="Your name" autoComplete="name" required value={form.owner_name} onChange={update('owner_name')} />
        <Field id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          required
          value={form.password}
          onChange={update('password')}
        />
        <Alert>{error}</Alert>
        <Button type="submit" className="w-full" loading={busy}>
          Create workspace
        </Button>
      </form>
    </AuthShell>
  )
}
