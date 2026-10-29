import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { Alert, Avatar, Badge, Button, Card, CONTROL_INLINE, CountUp, Field, Modal, SelectField, Skeleton, useFormGuard, useToast } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, apiDownload, errorText } from '../../lib/api.js'
import { addDays, formatDate, percent } from '../../lib/format.js'
import { query, useApi } from '../../lib/useApi.js'

const STATUS = {
  present: { label: 'Present', tone: 'success' },
  late: { label: 'Late', tone: 'warning' },
  absent: { label: 'Absent', tone: 'danger' },
  checked_out: { label: 'Checked out', tone: 'brand' },
}

function ManualModal({ open, onClose, staff, onSaved }) {
  const guard = useFormGuard()
  const [form, setForm] = useState({ staff_id: '', kind: 'in', note: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  async function save() {
    if (!guard()) return
    setBusy(true)
    setError('')
    try {
      await api('/attendance/manual', { method: 'POST', body: { ...form, note: form.note.trim() } })
      setForm({ staff_id: '', kind: 'in', note: '' })
      onSaved()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="edit"
      title="Mark by hand"
      description="For when the camera is not available. A reason is required and the entry is flagged as manual."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!form.staff_id || form.note.trim().length < 3}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField id="m_staff" label="Staff member" options={[{ value: '', label: 'Choose' }, ...(staff || []).filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.full_name }))]} value={form.staff_id} onChange={set('staff_id')} />
        <SelectField id="m_kind" label="Entry" options={[{ value: 'in', label: 'Check in (now)' }, { value: 'out', label: 'Check out (now)' }]} value={form.kind} onChange={set('kind')} />
        <Field id="m_note" kind="words" required label="Reason" placeholder="e.g. Camera not working at venue" value={form.note} onChange={set('note')} />
        <Alert key={error}>{error}</Alert>
      </div>
    </Modal>
  )
}

export function TodayTab({ today, staff, canManage, canExport }) {
  const toast = useToast()
  const guard = useFormGuard()
  const { company } = useAuth()
  const [day, setDay] = useState(today)
  const [lateAfter, setLateAfter] = useState('09:30')
  const [manual, setManual] = useState(false)
  const [range, setRange] = useState({ from: addDays(today, -13), to: today })
  const [exporting, setExporting] = useState(false)
  const sheet = useApi(`/attendance/sheet${query({ day, late_after: lateAfter })}`, { refreshMs: day === today ? 30000 : undefined })
  const logs = useApi(`/attendance/logs${query({ day })}`, { refreshMs: day === today ? 30000 : undefined })
  const s = sheet.data

  async function exportCsv() {
    if (!guard(document.getElementById('exp_from')?.closest('section'))) return
    if (range.to < range.from) {
      toast('The "To" date must be on or after the "From" date.', 'danger')
      return
    }
    setExporting(true)
    try {
      await apiDownload(`/attendance/export${query({ date_from: range.from, date_to: range.to })}`, `attendance_${range.from}_to_${range.to}.csv`)
    } catch (err) {
      toast(errorText(err), 'danger')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="animate-page-in space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="sheet_day" className="mb-1.5 block text-sm font-medium text-ink-700">Day</label>
          <input id="sheet_day" type="date" className={`${CONTROL_INLINE} w-44`} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </div>
        <div>
          <label htmlFor="late_after" className="mb-1.5 block text-sm font-medium text-ink-700">Late after</label>
          <input id="late_after" type="time" className={`${CONTROL_INLINE} w-32`} value={lateAfter} onChange={(e) => e.target.value && setLateAfter(e.target.value)} />
        </div>
        {canManage && (
          <Button variant="secondary" onClick={() => setManual(true)} className="ml-auto">
            <Icon name="edit" className="h-4 w-4" />
            Mark by hand
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Present', s?.present, 'text-kashi-700', 'checked in today, including late'],
          ['Late', s?.late, 'text-saffron-700', `arrived after ${lateAfter}`],
          ['Absent', s?.absent, 'text-red-700', 'no check-in yet'],
        ].map(([label, value, tone, hint]) => (
          <div key={label} className="rounded-panel bg-white px-5 py-4 shadow-glaze ring-1 ring-ink-200/70">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
            <p className={`tabular mt-1 font-display text-3xl ${tone}`}>{value == null ? '–' : <CountUp value={value} />}</p>
            <p className="mt-0.5 text-xs text-ink-500">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title={`Attendance sheet · ${formatDate(day, { year: true })}`} bodyClassName="px-0 pb-2 pt-4">
          {sheet.error && <div className="px-6"><Alert>{sheet.error}</Alert></div>}
          {!s && !sheet.error && <div className="px-6 pb-4"><Skeleton className="h-40 w-full" /></div>}
          {s && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-6 py-2.5 font-medium">Staff</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">In</th>
                    <th className="px-3 py-2.5 font-medium">Out</th>
                    <th className="px-6 py-2.5 text-right font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {s.rows.map((row) => (
                    <tr key={row.staff.id}>
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={row.staff.full_name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-900">{row.staff.full_name}</p>
                            <p className="text-xs text-ink-500">{row.staff.designation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><Badge tone={STATUS[row.status].tone} dot>{STATUS[row.status].label}</Badge></td>
                      <td className="tabular px-3 py-2.5 text-ink-700">{row.first_in || '—'}</td>
                      <td className="tabular px-3 py-2.5 text-ink-700">{row.last_out || '—'}</td>
                      <td className="tabular px-6 py-2.5 text-right text-ink-700">{row.hours != null ? row.hours.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Check-ins" description={`Times in ${company.timezone.replace(/_/g, ' ')}.`} bodyClassName="px-0 pb-2 pt-3">
            {logs.data?.length === 0 && <p className="px-6 py-4 text-sm text-ink-500">No one has checked in yet.</p>}
            <ul className="divide-y divide-ink-100">
              {(logs.data || []).map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 px-6 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-ink-900">{log.staff_name}</span>
                    <span className="block truncate text-xs text-ink-400">
                      {log.method === 'face' ? `Face · match ${percent(log.match_score)} · liveness ${log.liveness_score?.toFixed(2)}` : `By hand · ${log.note}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular font-semibold text-ink-800">{log.local_time}</span>
                    <Badge tone={log.kind === 'in' ? 'success' : 'brand'}>{log.kind === 'in' ? 'In' : 'Out'}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {canExport && (
            <Card title="Wages report" description="Days present and wages earned per person, as a CSV for the accounts team.">
              <div className="flex flex-wrap items-end gap-3">
                <Field id="exp_from" kind="date" required label="From" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                <Field id="exp_to" kind="date" required label="To" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
                <Button variant="secondary" onClick={exportCsv} loading={exporting}>
                  <Icon name="download" className="h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ManualModal
        open={manual}
        onClose={() => setManual(false)}
        staff={staff}
        onSaved={() => {
          setManual(false)
          sheet.reload()
          logs.reload()
          toast('Attendance marked by hand')
        }}
      />
    </div>
  )
}
