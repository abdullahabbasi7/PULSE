import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Button, Card, Field, PageHeader } from '../components/ui/index.js'
import { api, errorText } from '../lib/api.js'

function fromCompany(company) {
  return {
    name: company.name,
    phone: company.phone || '',
    city: company.city || '',
    address: company.address || '',
    daily_event_capacity: String(company.daily_event_capacity),
  }
}

export function SettingsPage() {
  const { company, setCompany } = useAuth()
  const [form, setForm] = useState(() => fromCompany(company))
  const [message, setMessage] = useState({ tone: 'success', text: '' })
  const [busy, setBusy] = useState(false)
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setMessage({ tone: 'success', text: '' })
    setBusy(true)
    try {
      const saved = await api('/companies/me', {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          daily_event_capacity: Number(form.daily_event_capacity),
        },
      })
      setCompany(saved)
      setForm(fromCompany(saved))
      setMessage({ tone: 'success', text: 'Settings saved.' })
    } catch (err) {
      setMessage({ tone: 'danger', text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Company settings" description="Details shown across your workspace and used by the booking module." />
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit} noValidate>
          <Field id="company_name" label="Company name" required value={form.name} onChange={update('name')} className="md:col-span-2" />
          <Field id="company_phone" label="Phone" type="tel" value={form.phone} onChange={update('phone')} />
          <Field id="company_city" label="City" value={form.city} onChange={update('city')} />
          <Field id="company_address" label="Address" value={form.address} onChange={update('address')} className="md:col-span-2" />
          <Field
            id="daily_capacity"
            label="Events per day"
            type="number"
            min="1"
            max="100"
            hint="Bookings (M1) warn when a date reaches this limit."
            value={form.daily_event_capacity}
            onChange={update('daily_event_capacity')}
          />
          <div className="md:col-span-2">
            <Alert tone={message.tone}>{message.text}</Alert>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" loading={busy}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
