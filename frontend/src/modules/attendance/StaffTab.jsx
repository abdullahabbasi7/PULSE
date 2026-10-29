import { useEffect, useRef, useState } from 'react'
import { Alert, Avatar, Badge, Button, Card, EmptyState, Field, Modal, Skeleton, useFormGuard, useToast } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, errorText } from '../../lib/api.js'
import { formatMoney, percent } from '../../lib/format.js'
import { sleep, useCamera } from '../../lib/useCamera.js'
import { grab } from './Kiosk.jsx'

const EMPTY = { full_name: '', designation: 'Waiter', phone: '', daily_wage: '', face_consent: false, is_active: true }

function toForm(member) {
  if (!member) return EMPTY
  return {
    full_name: member.full_name,
    designation: member.designation,
    phone: member.phone || '',
    daily_wage: Number(member.daily_wage) > 0 ? String(Number(member.daily_wage)) : '',
    face_consent: member.face_consent,
    is_active: member.is_active,
  }
}

// Add a staff member, or edit one (member given).
function StaffFormModal({ open, member, onClose, onSaved }) {
  const guard = useFormGuard()
  const editing = Boolean(member)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  useEffect(() => {
    if (open) {
      setForm(toForm(member))
      setError('')
    }
  }, [open, member])

  const losesFace = editing && member.face_enrolled_at && (!form.face_consent || !form.is_active)

  async function save() {
    if (!guard()) return
    setBusy(true)
    setError('')
    const body = {
      full_name: form.full_name.trim(),
      designation: form.designation.trim(),
      phone: form.phone.trim() || null,
      daily_wage: Number(form.daily_wage || 0),
      face_consent: form.face_consent,
    }
    try {
      const saved = editing
        ? await api(`/attendance/staff/${member.id}`, { method: 'PATCH', body: { ...body, is_active: form.is_active } })
        : await api('/attendance/staff', { method: 'POST', body })
      onSaved(saved, editing)
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
      icon={editing ? 'edit' : 'user'}
      title={editing ? 'Edit staff member' : 'Add staff member'}
      description={editing ? `Update ${member.full_name}'s details. Changes apply straight away.` : 'Waiters, cooks, helpers and drivers who work at events. They do not need a login.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>{editing ? 'Save changes' : 'Add staff'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="s_name" kind="personName" required label="Full name" value={form.full_name} onChange={set('full_name')} className="sm:col-span-2" />
        <Field id="s_role" kind="title" required label="Designation" value={form.designation} onChange={set('designation')} />
        <Field id="s_phone" kind="phone" label="Mobile number" type="tel" value={form.phone} onChange={set('phone')} />
        <Field id="s_wage" kind="money" label="Daily wage" type="text" inputMode="numeric" value={form.daily_wage} onChange={set('daily_wage')} />
        {editing && (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Status</span>
            <div className="inline-flex w-full rounded-xl bg-ink-100 p-1 text-sm font-semibold" role="radiogroup" aria-label="Status">
              {[
                [true, 'Working'],
                [false, 'Left / inactive'],
              ].map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={form.is_active === value}
                  onClick={() => setForm({ ...form, is_active: value })}
                  className={`h-8 flex-1 rounded-lg px-3 transition-colors ${form.is_active === value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-ink-50 p-4">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" checked={form.face_consent} onChange={(e) => setForm({ ...form, face_consent: e.target.checked })} />
        <span className="text-sm text-ink-700">
          <span className="font-semibold text-ink-900">The staff member agrees to face check-in.</span> A numeric face signature (not a photo) is stored and used only for attendance. They can withdraw at any time and it is deleted.
        </span>
      </label>
      {losesFace && (
        <div className="mt-3">
          <Alert tone="warning">{form.is_active ? 'Without consent' : 'Marking them inactive'}, their registered face will be deleted when you save.</Alert>
        </div>
      )}
      <div className="mt-4">
        <Alert key={error}>{error}</Alert>
      </div>
    </Modal>
  )
}

// Owner only. Deleting removes attendance history too, so offer "inactive" instead.
function DeleteStaffModal({ member, onClose, onDeleted, onDeactivated }) {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    if (!member) return
    setInfo(null)
    setError('')
    api(`/attendance/staff/${member.id}`).then(setInfo).catch((err) => setError(errorText(err)))
  }, [member])

  async function remove() {
    setBusy('delete')
    setError('')
    try {
      onDeleted(member, await api(`/attendance/staff/${member.id}`, { method: 'DELETE' }))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy('')
    }
  }

  async function deactivate() {
    setBusy('inactive')
    setError('')
    try {
      onDeactivated(await api(`/attendance/staff/${member.id}`, { method: 'PATCH', body: { is_active: false } }))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy('')
    }
  }

  const entries = info?.attendance_entries ?? 0
  return (
    <Modal
      open={Boolean(member)}
      onClose={onClose}
      icon="trash"
      tone="danger"
      title="Delete staff member?"
      description={member ? `${member.full_name} · ${member.designation}` : ''}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} className="mr-auto">Cancel</Button>
          {member?.is_active && (
            <Button variant="secondary" onClick={deactivate} loading={busy === 'inactive'} disabled={Boolean(busy)}>
              Mark inactive
            </Button>
          )}
          <Button variant="danger" onClick={remove} loading={busy === 'delete'} disabled={Boolean(busy) || !info}>
            <Icon name="trash" className="h-4 w-4" />
            Delete
          </Button>
        </>
      }
    >
      {!info && !error && <Skeleton className="h-16 w-full" />}
      {info && (
        <div className="space-y-3 text-sm text-ink-700">
          <p>This permanently removes the record. It cannot be undone.</p>
          <ul className="space-y-1.5 rounded-xl bg-red-50/70 p-3.5 text-red-800 ring-1 ring-inset ring-red-100">
            <li className="flex gap-2"><Icon name="close" className="mt-0.5 h-4 w-4 shrink-0" />Their details and daily wage</li>
            {info.face_enrolled_at && <li className="flex gap-2"><Icon name="close" className="mt-0.5 h-4 w-4 shrink-0" />Their registered face</li>}
            <li className="flex gap-2">
              <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0" />
              {entries ? `${entries} attendance ${entries === 1 ? 'entry' : 'entries'}, so past wage reports will no longer include them` : 'No attendance history yet'}
            </li>
          </ul>
          {entries > 0 && member?.is_active && <p className="text-ink-500">If they have just left, <span className="font-medium text-ink-800">Mark inactive</span> keeps their history for wage reports.</p>}
        </div>
      )}
      <div className="mt-3">
        <Alert key={error}>{error}</Alert>
      </div>
    </Modal>
  )
}

const POSES = [
  { id: 'front', label: 'Look straight at the camera', hint: 'Face in the oval, eyes open' },
  { id: 'up', label: 'Tilt the chin up slightly', hint: 'Just a little, keep looking ahead', arrow: 'arrowUp' },
  { id: 'left', label: 'Turn a little to your left', hint: 'About a quarter turn', arrow: 'arrowLeft' },
  { id: 'right', label: 'Turn a little to your right', hint: 'About a quarter turn', arrow: 'arrowRight' },
]

function EnrollModal({ member, onClose, onDone }) {
  const camera = useCamera({ facingMode: 'user' })
  const [shots, setShots] = useState([])
  const [step, setStep] = useState(-1) // pose being captured, -1 when idle
  const [count, setCount] = useState(0) // 3-2-1 before the first pose
  const [live, setLive] = useState(null) // latest pose check: { ok, progress, hint }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const run = useRef(0) // bumped to stop a capture that is in progress
  const capturing = step >= 0 || count > 0

  // The camera starts as soon as the window opens.
  useEffect(() => {
    if (!member) return undefined
    setShots([])
    setError('')
    const timer = setTimeout(() => camera.start(), 50)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member])

  // Each pose is only accepted when the server sees the head in that pose in two
  // frames in a row. The front photo is the reference for the turns.
  async function capture() {
    const me = ++run.current
    const active = () => run.current === me
    setError('')
    setShots([])
    setLive(null)
    for (let n = 3; n > 0; n -= 1) {
      setCount(n)
      await sleep(650)
      if (!active()) return
    }
    setCount(0)
    const taken = []
    let baseline = null
    for (let k = 0; k < POSES.length; k += 1) {
      setStep(k)
      setLive(null)
      let streak = 0
      let firstOk = null
      while (active()) {
        const frame = grab(camera.videoRef.current, 640, 0.85)
        if (!frame) {
          await sleep(250)
          continue
        }
        let res
        try {
          res = await api('/attendance/pose', { method: 'POST', body: { image: frame, pose: POSES[k].id, baseline } })
        } catch (err) {
          if (!active()) return
          setLive({ ok: false, progress: 0, hint: errorText(err) })
          await sleep(800)
          continue
        }
        if (!active()) return
        setLive(res)
        if (res.ok) {
          streak += 1
          firstOk = firstOk || res
          if (streak >= 2) {
            taken.push(frame)
            setShots([...taken])
            if (k === 0) baseline = { yaw: (firstOk.yaw + res.yaw) / 2, pitch: (firstOk.pitch + res.pitch) / 2 }
            break
          }
        } else {
          streak = 0
          firstOk = null
        }
        await sleep(150)
      }
      if (!active()) return
      setLive({ ok: true, progress: 1, hint: k < POSES.length - 1 ? 'Got it' : 'All done' })
      await sleep(650)
    }
    setStep(-1)
    setLive(null)
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
    run.current += 1
    camera.stop()
    setLive(null)
    setShots([])
    setStep(-1)
    setCount(0)
    onClose()
  }

  const done = shots.length >= POSES.length
  return (
    <Modal
      open={Boolean(member)}
      onClose={close}
      icon="camera"
      title="Register face"
      description={member ? `Four quick photos of ${member.full_name}. Good light, one face in view, no mask or sunglasses.` : ''}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close} className="mr-auto">Cancel</Button>
          {done ? (
            <>
              <Button variant="secondary" onClick={capture} disabled={camera.state !== 'on' || capturing || busy}>
                <Icon name="refresh" className="h-4 w-4" />
                Retake
              </Button>
              <Button onClick={save} loading={busy}>
                <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
                Save face
              </Button>
            </>
          ) : (
            <Button onClick={capture} loading={capturing} disabled={camera.state !== 'on'}>
              <Icon name="camera" className="h-4 w-4" />
              {capturing ? 'Taking photos…' : 'Take photos'}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Camera */}
        <div>
          <div className="relative mx-auto aspect-[4/3] max-h-[44vh] w-3/4 md:w-full overflow-hidden rounded-2xl bg-ink-900">
            <video ref={camera.videoRef} playsInline muted className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${camera.state === 'on' ? '' : 'opacity-0'}`} />
            {camera.state === 'on' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`aspect-[3/4] h-[78%] rounded-[50%] border-[3px] shadow-[0_0_0_9999px_rgba(23,28,52,0.35)] transition-colors duration-300 ${
                    live?.ok ? 'border-kashi-400' : step >= 0 ? 'border-saffron-300' : 'border-white/80'
                  }`}
                />
              </div>
            )}
            {camera.state !== 'on' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-white">
                <Icon name="camera" className="h-8 w-8 text-white/70" />
                <p className="text-sm text-white/80">{camera.state === 'starting' ? 'Starting the camera…' : 'Allow camera access in your browser.'}</p>
                {camera.state !== 'starting' && (
                  <Button size="sm" onClick={camera.start} className="!bg-white !text-ink-900">
                    Start camera
                  </Button>
                )}
              </div>
            )}
            {count > 0 && (
              <span key={count} className="absolute inset-0 flex animate-pop-in items-center justify-center font-display text-7xl text-white drop-shadow-lg">
                {count}
              </span>
            )}
            {step >= 0 && (
              <div className="absolute inset-x-3 bottom-3 flex justify-center">
                <p
                  className={`flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-lg backdrop-blur transition-colors duration-200 ${
                    live?.ok ? 'bg-kashi-600/90 text-white' : 'bg-white/90 text-ink-900'
                  }`}
                >
                  {POSES[step].arrow && !live?.ok && <Icon name={POSES[step].arrow} className="h-4 w-4 shrink-0 animate-pulse" strokeWidth={2.4} />}
                  {live?.ok && <Icon name="check" className="h-4 w-4 shrink-0" strokeWidth={2.6} />}
                  <span className="truncate">{live?.hint || POSES[step].label}</span>
                </p>
              </div>
            )}
          </div>
          {camera.error && (
            <div className="mt-3">
              <Alert tone="warning">{camera.error}</Alert>
            </div>
          )}
        </div>

        {/* Poses checklist and thumbnails */}
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Four poses</p>
          <ol className="mt-2 space-y-2">
            {POSES.map((pose, k) => {
              const taken = Boolean(shots[k])
              const active = step === k
              return (
                <li
                  key={pose.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-inset transition-colors duration-300 ${
                    active ? 'bg-brand-50 ring-brand-200' : taken ? 'bg-kashi-50/60 ring-kashi-100' : 'bg-white ring-ink-200/70'
                  }`}
                >
                  {taken ? (
                    <img src={shots[k]} alt="" className="h-10 w-10 shrink-0 -scale-x-100 rounded-lg object-cover ring-2 ring-kashi-300" />
                  ) : (
                    <span
                      className={`tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                        active ? 'animate-pulse bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'
                      }`}
                    >
                      {k + 1}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink-900">{pose.label}</span>
                    <span className="hidden text-xs text-ink-500 sm:block">{pose.hint}</span>
                    {active && !taken && (
                      <span className="mt-1.5 block h-1 w-28 overflow-hidden rounded-full bg-brand-100">
                        <span className="block h-full rounded-full bg-brand-600 transition-[width] duration-200" style={{ width: `${Math.round((live?.progress || 0) * 100)}%` }} />
                      </span>
                    )}
                  </span>
                  {taken && <Icon name="check" className="ml-auto h-4 w-4 shrink-0 text-kashi-600" strokeWidth={2.6} />}
                </li>
              )
            })}
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-ink-400">
            {done
              ? 'All four poses confirmed. Save to register the face, or retake if any looks dark or blurry.'
              : capturing
                ? 'Each pose is taken only when the camera sees it. Move slowly and hold the pose for a moment.'
                : 'Press Take photos and follow the prompts. Each pose is checked by the camera before it is ticked.'}
          </p>
          <div className="mt-3">
            <Alert key={error}>{error}</Alert>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function StaffTab({ staff, setStaff, error, canManage, canDelete }) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
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
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink-900">
                    <span className="truncate">{s.full_name}</span>
                    {!s.is_active && <Badge tone="neutral">Inactive</Badge>}
                  </p>
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
                {(canManage || canDelete) && (
                  <span className="flex items-center gap-1 border-l border-ink-100 pl-2">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        title="Edit"
                        aria-label={`Edit ${s.full_name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleting(s)}
                        title="Delete"
                        aria-label={`Delete ${s.full_name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    )}
                  </span>
                )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <StaffFormModal
        open={adding || Boolean(editing)}
        member={editing}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
        onSaved={(m, wasEdit) => {
          if (wasEdit) {
            replace(m)
            setEditing(null)
            toast(`${m.full_name}'s record updated`)
          } else {
            setStaff((list) => [...(list || []), m])
            setAdding(false)
            toast(`${m.full_name} added`)
            if (m.face_consent) setEnrolling(m)
          }
        }}
      />
      <DeleteStaffModal
        member={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(m, res) => {
          setStaff((list) => list.filter((x) => x.id !== m.id))
          setDeleting(null)
          toast(`${res.full_name} deleted${res.attendance_entries_deleted ? ` with ${res.attendance_entries_deleted} attendance entries` : ''}`)
        }}
        onDeactivated={(m) => {
          replace(m)
          setDeleting(null)
          toast(`${m.full_name} marked inactive. Their history is kept.`)
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
