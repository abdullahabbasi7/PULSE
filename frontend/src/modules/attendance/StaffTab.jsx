import { useState } from 'react'
import { Alert, Avatar, Badge, Button, Card, EmptyState, Field, Modal, Skeleton, useToast } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, errorText } from '../../lib/api.js'
import { formatMoney, percent } from '../../lib/format.js'
import { sleep, useCamera } from '../../lib/useCamera.js'
import { grab } from './Kiosk.jsx'

const EMPTY = { full_name: '', designation: 'Waiter', phone: '', daily_wage: '', face_consent: false }

function AddStaffModal({ open, onClose, onAdded }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function save() {
    setBusy(true)
    setError('')
    try {
      const member = await api('/attendance/staff', {
        method: 'POST',
        body: { ...form, full_name: form.full_name.trim(), phone: form.phone.trim() || null, daily_wage: Number(form.daily_wage || 0) },
      })
      setForm(EMPTY)
      onAdded(member)
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
      icon="user"
      title="Add staff member"
      description="Waiters, cooks, helpers and drivers who work at events. They do not need a login."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>Add staff</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="s_name" label="Full name" value={form.full_name} onChange={set('full_name')} className="sm:col-span-2" />
        <Field id="s_role" label="Designation" value={form.designation} onChange={set('designation')} />
        <Field id="s_phone" label="Mobile number" type="tel" value={form.phone} onChange={set('phone')} />
        <Field id="s_wage" label="Daily wage" type="number" min="0" value={form.daily_wage} onChange={set('daily_wage')} />
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-ink-50 p-4">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" checked={form.face_consent} onChange={(e) => setForm({ ...form, face_consent: e.target.checked })} />
        <span className="text-sm text-ink-700">
          <span className="font-semibold text-ink-900">The staff member agrees to face check-in.</span> A numeric face signature (not a photo) is stored and used only for attendance. They can withdraw at any time and it is deleted.
        </span>
      </label>
      <div className="mt-4">
        <Alert key={error}>{error}</Alert>
      </div>
    </Modal>
  )
}

function EnrollModal({ member, onClose, onDone }) {
  const camera = useCamera({ facingMode: 'user' })
  const [shots, setShots] = useState([])
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function capture() {
    setError('')
    const taken = []
    const steps = ['Look at the camera', 'Tilt your chin up slightly', 'Turn a little to the left', 'Turn a little to the right']
    for (const step of steps) {
      setPrompt(step)
      await sleep(900)
      taken.push(grab(camera.videoRef.current, 720, 0.9))
      setShots([...taken])
    }
    setPrompt('')
  }

  async function save() {
    setBusy(true)
    setError('')
    try {
      const res = await api(`/attendance/staff/${member.id}/enroll`, { method: 'POST', body: { images: shots.filter(Boolean) } })
      camera.stop()
      onDone(res.staff, `Face registered for ${res.staff.full_name} from ${res.photos_used} photos (consistency ${percent(res.consistency)}).`)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  function close() {
    camera.stop()
    setShots([])
    onClose()
  }

  return (
    <Modal
      open={Boolean(member)}
      onClose={close}
      icon="camera"
      title="Register face"
      description={member ? `Four quick photos of ${member.full_name} in good light, one face in view.` : ''}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={shots.length < 3 || Boolean(prompt)}>Save face</Button>
        </>
      }
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-900">
        <video ref={camera.videoRef} playsInline muted className={`h-full w-full -scale-x-100 object-cover ${camera.state === 'on' ? '' : 'opacity-0'}`} />
        {camera.state !== 'on' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button onClick={camera.start} loading={camera.state === 'starting'} className="!bg-white !text-ink-900">
              <Icon name="camera" className="h-4 w-4" />
              Start camera
            </Button>
          </div>
        )}
        {prompt && <p className="absolute inset-x-0 bottom-4 animate-fade-in text-center text-lg font-semibold text-white drop-shadow">{prompt}</p>}
      </div>
      {camera.error && (
        <div className="mt-3">
          <Alert tone="warning">{camera.error}</Alert>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={capture} disabled={camera.state !== 'on' || Boolean(prompt)}>
          <Icon name="camera" className="h-4 w-4" />
          {shots.length ? 'Retake photos' : 'Take photos'}
        </Button>
        <div className="flex gap-2">
          {shots.map((src, i) => (
            <img key={i} src={src} alt={`Photo ${i + 1}`} className="h-14 w-14 -scale-x-100 rounded-lg object-cover ring-1 ring-ink-200" />
          ))}
        </div>
      </div>
      <div className="mt-3">
        <Alert key={error}>{error}</Alert>
      </div>
    </Modal>
  )
}

export function StaffTab({ staff, setStaff, error, canManage }) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [enrolling, setEnrolling] = useState(null)
  const [busy, setBusy] = useState(null)
  const replace = (m) => setStaff((list) => list.map((s) => (s.id === m.id ? m : s)))

  async function act(member, request, message) {
    setBusy(member.id)
    try {
      replace(await request())
      toast(message)
    } catch (err) {
      toast(errorText(err), 'danger')
    } finally {
      setBusy(null)
    }
  }

  const enrolled = (staff || []).filter((s) => s.face_enrolled_at).length
  return (
    <div className="animate-page-in">
      <Card
        bodyClassName="pt-4"
        title={staff ? `${staff.length} staff · ${enrolled} with face registered` : 'Staff'}
        actions={
          canManage && (
            <Button onClick={() => setAdding(true)}>
              <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
              Add staff
            </Button>
          )
        }
      >
        {error && <Alert>{error}</Alert>}
        {!staff && !error && <Skeleton className="h-40 w-full" />}
        {staff?.length === 0 && <EmptyState title="No staff yet" icon="badge">Add the people who work at your events, then register their faces for check-in.</EmptyState>}
        {staff?.length > 0 && (
          <ul className="divide-y divide-ink-100 border-t border-ink-100">
            {staff.map((s) => (
              <li key={s.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5 sm:px-6 ${s.is_active ? '' : 'opacity-60'}`}>
                <Avatar name={s.full_name} />
                <div className="min-w-0 flex-1 basis-44">
                  <p className="truncate text-sm font-semibold text-ink-900">{s.full_name}</p>
                  <p className="truncate text-sm text-ink-500">
                    {s.designation}
                    {s.phone && ` · ${s.phone}`}
                    {Number(s.daily_wage) > 0 && ` · ${formatMoney(s.daily_wage)}/day`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {s.face_enrolled_at ? (
                    <Badge tone="success" dot>Face registered</Badge>
                  ) : s.face_consent ? (
                    <Badge tone="warning" dot>No face yet</Badge>
                  ) : (
                    <Badge tone="neutral">No consent</Badge>
                  )}
                  {canManage && s.is_active && s.face_consent && (
                    <Button variant={s.face_enrolled_at ? 'ghost' : 'soft'} size="sm" onClick={() => setEnrolling(s)}>
                      <Icon name="camera" className="h-4 w-4" />
                      {s.face_enrolled_at ? 'Re-register' : 'Register face'}
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={busy === s.id}
                      onClick={() =>
                        act(
                          s,
                          () => api(`/attendance/staff/${s.id}`, { method: 'PATCH', body: { face_consent: !s.face_consent } }),
                          s.face_consent ? `Consent withdrawn. ${s.full_name}'s face data was deleted.` : `Consent recorded for ${s.full_name}`,
                        )
                      }
                    >
                      {s.face_consent ? 'Withdraw consent' : 'Record consent'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <AddStaffModal
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(m) => {
          setStaff((list) => [...(list || []), m])
          setAdding(false)
          toast(`${m.full_name} added`)
          if (m.face_consent) setEnrolling(m)
        }}
      />
      <EnrollModal
        member={enrolling}
        onClose={() => setEnrolling(null)}
        onDone={(m, message) => {
          replace(m)
          setEnrolling(null)
          toast(message)
        }}
      />
    </div>
  )
}
