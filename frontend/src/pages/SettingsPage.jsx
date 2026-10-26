import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Button, Card, Field, PageHeader, StepperField, useToast } from '../components/ui/index.js'
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

function Section({ title, description, children }) {
  return (
    <div className="grid gap-6 py-8 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div>
        <h2 className="text-[0.95rem] font-semibold text-ink-900">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { company, setCompany } = useAuth()
  const toast = useToast()
  const [saved, setSaved] = useState(() => fromCompany(company))
  const [form, setForm] = useState(saved)
  const [busy, setBusy] = useState(false)
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await api('/companies/me', {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          daily_event_capacity: Number(form.daily_event_capacity),
        },
      })
      setCompany(result)
      const next = fromCompany(result)
      setSaved(next)
      setForm(next)
      toast('Settings saved')
    } catch (err) {
      toast(errorText(err), 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Company settings" description="These details appear across your workspace and on documents you send to clients." />
      <form onSubmit={submit} noValidate>
        <Card bodyClassName="divide-y divide-ink-100 px-5 sm:px-8">
          <Section title="Company profile" description="Shown in the sidebar and on client documents.">
            <Field id="company_name" label="Company name" required value={form.name} onChange={update('name')} className="sm:col-span-2" />
            <Field id="company_phone" label="Phone" type="tel" value={form.phone} onChange={update('phone')} />
            <Field id="company_city" label="City" value={form.city} onChange={update('city')} />
            <Field id="company_address" label="Address" value={form.address} onChange={update('address')} className="sm:col-span-2" />
          </Section>
          <Section title="Event capacity" description="How many events your kitchen and crew can handle on one day.">
            <StepperField
              id="daily_capacity"
              label="Events per day"
              hint="Bookings warn you when a date reaches this number."
              value={form.daily_event_capacity}
              onChange={(value) => setForm({ ...form, daily_event_capacity: value })}
            />
          </Section>
        </Card>

        {/* Save bar rises into view only when something has changed. */}
        {dirty && (
          <div className="sticky bottom-4 z-20 mt-6 animate-rise-in">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-900 px-5 py-3 text-white shadow-pop">
              <p className="text-sm">You have unsaved changes.</p>
              <div className="flex gap-2">
                <Button variant="ghost" className="!text-white hover:!bg-white/10" onClick={() => setForm(saved)}>
                  Discard
                </Button>
                <Button type="submit" loading={busy} className="!bg-white !text-ink-900 !shadow-none hover:!bg-brand-50">
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </>
  )
}
