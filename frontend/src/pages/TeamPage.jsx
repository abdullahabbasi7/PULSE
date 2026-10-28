import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Avatar, Badge, Button, Card, CONTROL, Field, Modal, PageHeader, PasswordStrength, SelectField, Skeleton, useToast } from '../components/ui/index.js'
import { Icon } from '../layout/icons.jsx'
import { api, errorText } from '../lib/api.js'
import { isStrong } from '../lib/passwordRules.js'
import { ROLES, ROLE_LABELS } from '../lib/roles.js'

const EMPTY = { full_name: '', email: '', phone: '', role: 'staff', password: '' }

const ROLE_TONES = { owner: 'brand', manager: 'success', staff: 'neutral', driver: 'warning', accounts: 'neutral' }

// Smoothly opens and closes its content (grid-rows trick, no height measuring).
function Collapse({ open, children }) {
  const ref = useRef(null)
  // Closed content can't be tabbed into or read by screen readers.
  useEffect(() => {
    if (ref.current) ref.current.inert = !open
  }, [open])
  return (
    <div
      ref={ref}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

function AddMemberForm({ canAddOwner, onAdded, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const roleOptions = ROLES.filter((role) => canAddOwner || role !== 'owner').map((role) => ({ value: role, label: ROLE_LABELS[role] }))
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!isStrong(form.password, { email: form.email, fullName: form.full_name })) {
      setError('The temporary password must meet every rule in the checklist.')
      return
    }
    setBusy(true)
    try {
      const user = await api('/users', {
        method: 'POST',
        body: { ...form, full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() || null },
      })
      setForm(EMPTY)
      onAdded(user)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Add a team member"
      description="They sign in with this email or mobile number, using the temporary password you share with them."
      className="mb-6"
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={submit} noValidate>
        <Field id="member_name" label="Full name" required value={form.full_name} onChange={update('full_name')} />
        <Field id="member_email" label="Email" type="email" required value={form.email} onChange={update('email')} />
        <Field id="member_phone" label="Mobile number" type="tel" placeholder="0300 1234567" hint="Optional. Lets them sign in with their number." value={form.phone} onChange={update('phone')} />
        <SelectField id="member_role" label="Role" options={roleOptions} value={form.role} onChange={update('role')} />
        <div className="md:col-span-2">
          <Field id="member_password" label="Temporary password" type="password" autoComplete="new-password" required value={form.password} onChange={update('password')} />
          <PasswordStrength password={form.password} email={form.email} fullName={form.full_name} onSuggest={(pw) => setForm((f) => ({ ...f, password: pw }))} />
        </div>
        {error && (
          <div className="md:col-span-2">
            <Alert key={error}>{error}</Alert>
          </div>
        )}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" loading={busy}>
            Add member
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}

function MemberRow({ member, isSelf, canEdit, canReset, onChanged, onReset }) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function patch(body, message) {
    setBusy(true)
    try {
      onChanged(await api(`/users/${member.id}`, { method: 'PATCH', body }))
      toast(message)
    } catch (err) {
      toast(errorText(err), 'danger')
    } finally {
      setBusy(false)
    }
  }

  const editable = canEdit && !isSelf
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-ink-50/70 sm:px-6 ${member.is_active ? '' : 'opacity-60'}`}>
      <Avatar name={member.full_name} />
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-semibold text-ink-900">
          {member.full_name}
          {isSelf && <span className="ml-2 text-xs font-normal text-ink-400">You</span>}
        </p>
        <p className="truncate text-sm text-ink-500">
          {member.email}
          {member.phone && <span className="tabular text-ink-400"> · {member.phone}</span>}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {editable ? (
          <div className="relative">
            <select
              aria-label={`Role for ${member.full_name}`}
              className={`${CONTROL} w-36 appearance-none py-2 pr-9`}
              value={member.role}
              disabled={busy}
              onChange={(event) => patch({ role: event.target.value }, `${member.full_name} is now ${ROLE_LABELS[event.target.value]}`)}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          </div>
        ) : (
          <Badge tone={ROLE_TONES[member.role]}>{ROLE_LABELS[member.role]}</Badge>
        )}

        <Badge tone={member.is_active ? 'success' : 'neutral'} dot>
          {member.is_active ? 'Active' : 'Deactivated'}
        </Badge>

        {canReset && !isSelf && (
          <Button variant="ghost" size="sm" onClick={() => onReset(member)}>
            <Icon name="lock" className="h-4 w-4" />
            Reset password
          </Button>
        )}
        {editable && (
          <Button
            variant={member.is_active ? 'danger' : 'secondary'}
            size="sm"
            loading={busy}
            onClick={() =>
              patch(
                { is_active: !member.is_active },
                member.is_active ? `${member.full_name} deactivated` : `${member.full_name} reactivated`,
              )
            }
          >
            {member.is_active ? 'Deactivate' : 'Reactivate'}
          </Button>
        )}
      </div>
    </li>
  )
}

function ResetPasswordModal({ member, onClose }) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setPassword('')
    setError('')
  }, [member])
  const strong = member ? isStrong(password, { email: member.email, fullName: member.full_name }) : false

  async function submit(event) {
    event?.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api(`/users/${member.id}/reset-password`, { method: 'POST', body: { new_password: password } })
      toast(`New password set for ${member.full_name}. Their account is unlocked.`)
      onClose()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(member)}
      onClose={onClose}
      title="Reset password"
      description={member ? `Set a temporary password for ${member.full_name} and share it with them in person. This also unlocks a locked account.` : ''}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!strong}>Set password</Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-3">
        <Field id="reset_password" label="New temporary password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {member && <PasswordStrength password={password} email={member.email} fullName={member.full_name} onSuggest={setPassword} />}
        <Alert key={error}>{error}</Alert>
      </form>
    </Modal>
  )
}

export function TeamPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [members, setMembers] = useState(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const isOwner = user.role === 'owner'
  const [resetting, setResetting] = useState(null)

  const load = useCallback(async () => {
    try {
      setMembers(await api('/users'))
    } catch (err) {
      setError(errorText(err))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const replace = (updated) => setMembers((list) => list.map((m) => (m.id === updated.id ? updated : m)))

  const visible = useMemo(() => {
    if (!members) return null
    const needle = query.trim().toLowerCase()
    if (!needle) return members
    return members.filter((m) => `${m.full_name} ${m.email} ${m.phone || ''} ${m.role}`.toLowerCase().includes(needle))
  }, [members, query])

  return (
    <>
      <PageHeader
        title="Team accounts"
        description="Everyone who signs in to your company's workspace. Each person's role decides which modules they can open."
        actions={
          !adding && (
            <Button onClick={() => setAdding(true)}>
              <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
              Add member
            </Button>
          )
        }
      />

      <Collapse open={adding}>
        <AddMemberForm
          canAddOwner={isOwner}
          onCancel={() => setAdding(false)}
          onAdded={(member) => {
            setMembers((list) => [...(list || []), member])
            setAdding(false)
            toast(`${member.full_name} added as ${ROLE_LABELS[member.role]}`)
          }}
        />
      </Collapse>

      <Card
        bodyClassName="pt-4"
        title={members ? `${members.length} ${members.length === 1 ? 'member' : 'members'}` : 'Members'}
        description={isOwner ? 'Change a role or deactivate an account here.' : 'Only the owner can change roles or deactivate accounts.'}
        actions={
          <div className="relative w-full sm:w-64">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, phone or role"
              aria-label="Search members"
              className={`${CONTROL} py-2 pl-9`}
            />
          </div>
        }
      >
        {error && (
          <div className="px-5 pb-4 sm:px-6">
            <Alert>{error}</Alert>
          </div>
        )}
        {!members && !error && (
          <ul className="divide-y divide-ink-100 border-t border-ink-100">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </li>
            ))}
          </ul>
        )}
        {visible && (
          <ul className="divide-y divide-ink-100 border-t border-ink-100">
            {visible.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isSelf={member.id === user.id}
                canEdit={isOwner}
                canReset={isOwner || member.role !== 'owner'}
                onChanged={replace}
                onReset={setResetting}
              />
            ))}
            {visible.length === 0 && <li className="px-6 py-10 text-center text-sm text-ink-500">No one matches "{query}".</li>}
          </ul>
        )}
      </Card>
      <ResetPasswordModal member={resetting} onClose={() => setResetting(null)} />
    </>
  )
}
