import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Alert, Badge, Button, Card, Field, PageHeader, SelectField, Spinner } from '../components/ui/index.js'
import { api, errorText } from '../lib/api.js'
import { ROLES, ROLE_LABELS } from '../lib/roles.js'

const EMPTY = { full_name: '', email: '', role: 'staff', password: '' }

function AddMemberForm({ canAddOwner, onAdded }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const roleOptions = ROLES.filter((role) => canAddOwner || role !== 'owner').map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  }))
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await api('/users', { method: 'POST', body: { ...form, full_name: form.full_name.trim(), email: form.email.trim() } })
      setForm(EMPTY)
      onAdded(user)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Add a team member" description="Share the temporary password with them; they sign in with their email.">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={submit} noValidate>
        <Field id="member_name" label="Full name" required value={form.full_name} onChange={update('full_name')} />
        <Field id="member_email" label="Email" type="email" required value={form.email} onChange={update('email')} />
        <SelectField id="member_role" label="Role" options={roleOptions} value={form.role} onChange={update('role')} />
        <Field
          id="member_password"
          label="Temporary password"
          type="text"
          autoComplete="off"
          hint="At least 8 characters."
          required
          value={form.password}
          onChange={update('password')}
        />
        <div className="md:col-span-2">
          <Alert>{error}</Alert>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" loading={busy}>
            Add member
          </Button>
        </div>
      </form>
    </Card>
  )
}

function MemberRow({ member, isSelf, canEdit, onChanged }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function patch(body) {
    setError('')
    setBusy(true)
    try {
      onChanged(await api(`/users/${member.id}`, { method: 'PATCH', body }))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const editable = canEdit && !isSelf
  return (
    <tr className="border-t border-ink-100 align-middle">
      <td className="py-3 pr-4">
        <p className="font-medium text-ink-900">
          {member.full_name} {isSelf && <span className="text-xs font-normal text-ink-400">(you)</span>}
        </p>
        <p className="text-xs text-ink-500">{member.email}</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="py-3 pr-4">
        {editable ? (
          <select
            aria-label={`Role for ${member.full_name}`}
            className="rounded-lg border-0 bg-white py-1.5 pl-2 pr-8 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500"
            value={member.role}
            disabled={busy}
            onChange={(event) => patch({ role: event.target.value })}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-ink-700">{ROLE_LABELS[member.role]}</span>
        )}
      </td>
      <td className="py-3 pr-4">
        <Badge tone={member.is_active ? 'success' : 'neutral'}>{member.is_active ? 'Active' : 'Deactivated'}</Badge>
      </td>
      <td className="py-3 text-right">
        {editable && (
          <Button variant="secondary" size="sm" loading={busy} onClick={() => patch({ is_active: !member.is_active })}>
            {member.is_active ? 'Deactivate' : 'Reactivate'}
          </Button>
        )}
      </td>
    </tr>
  )
}

export function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState(null)
  const [error, setError] = useState('')
  const isOwner = user.role === 'owner'

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

  return (
    <>
      <PageHeader
        title="Team accounts"
        description="Everyone who signs in to your company's PULSE workspace. Roles decide which modules each person sees."
      />
      <div className="space-y-6">
        <AddMemberForm canAddOwner={isOwner} onAdded={(member) => setMembers((list) => [...(list || []), member])} />
        <Card title="Members" description={isOwner ? 'Only the owner can change roles or deactivate accounts.' : undefined}>
          <Alert>{error}</Alert>
          {!members && !error && <Spinner />}
          {members && (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-ink-400">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      isSelf={member.id === user.id}
                      canEdit={isOwner}
                      onChanged={replace}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
