import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { KashiTiles } from '../components/KashiTiles.jsx'
import { Badge, Card, Skeleton } from '../components/ui/index.js'
import { Icon } from '../layout/icons.jsx'
import { rolesFor } from '../layout/nav.js'
import { api } from '../lib/api.js'
import { GLAZE, MODULES } from '../modules/registry.js'

function greeting(date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function WelcomeBanner({ firstName, company }) {
  const now = new Date()
  const today = now.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-700 px-6 py-8 text-white shadow-lift sm:px-10 sm:py-10">
      <KashiTiles
        cols={7}
        rows={4}
        className="absolute -right-24 top-0 h-full w-[34rem] opacity-90 [mask-image:linear-gradient(to_left,black_30%,transparent)]"
        starClass="stroke-white/30"
        accentClass="stroke-kashi-300"
        diamondClass="stroke-white/15"
      />
      <div className="relative max-w-xl">
        <p className="text-sm text-brand-100/80">{today}</p>
        <h1 className="mt-2 font-display text-[2.1rem] leading-tight sm:text-[2.6rem]">
          {greeting(now)}, {firstName}
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-brand-100/90">
          {company.name} can run up to <span className="tabular font-semibold text-white">{company.daily_event_capacity}</span> events a
          day. Bookings, stock and staff for each one will come together here.
        </p>
      </div>
    </section>
  )
}

function ModuleCard({ module, glaze }) {
  return (
    <Link
      to={module.path}
      className="group relative flex flex-col overflow-hidden rounded-panel bg-white p-6 shadow-glaze ring-1 ring-ink-200/70 transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${glaze.tile}`}>
          <Icon name={module.icon} className="h-[22px] w-[22px]" />
        </span>
        <span className="tabular text-xs font-semibold text-ink-400">{module.code}</span>
      </div>
      <h2 className="mt-5 text-lg font-semibold text-ink-900">{module.title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{module.summary}</p>

      <div className={`mt-5 rounded-xl px-3.5 py-3 ring-1 ring-inset ${glaze.soft}`}>
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon name="sparkle" className="h-3.5 w-3.5" strokeWidth={2} />
          AI: {module.ai.name}
        </p>
        <p className="mt-1 text-xs leading-relaxed opacity-90">{module.ai.technique}</p>
      </div>

      <div className="mt-auto flex items-center justify-between pt-5 text-sm">
        <span className="text-ink-400">{module.owner.split(' ')[0]}'s module</span>
        <span className={`inline-flex items-center gap-1 font-semibold ${glaze.text}`}>
          Open
          <Icon name="chevronRight" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

function SetupChecklist({ company, teamSize }) {
  const steps = [
    {
      title: 'Complete your company details',
      text: 'Phone, city and address appear on bookings and invoices.',
      done: Boolean(company.phone && company.city && company.address),
      to: '/settings',
      action: 'Open settings',
    },
    {
      title: 'Invite your team',
      text: 'Give managers, staff, drivers and accounts their own sign-in.',
      done: teamSize > 1,
      to: '/team',
      action: 'Add members',
    },
    {
      title: 'Record your first booking',
      text: 'Available once the bookings module is ready.',
      done: false,
      to: '/bookings',
      action: 'View bookings',
    },
  ]
  const doneCount = steps.filter((step) => step.done).length

  return (
    <Card
      title="Set up your workspace"
      description={`${doneCount} of ${steps.length} done`}
      actions={
        <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
          <div className="h-full rounded-full bg-kashi-500 transition-[width] duration-700 ease-out" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      }
    >
      <ol className="space-y-1">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Link to={step.to} className="group -mx-3 flex items-start gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-ink-50">
              <span
                className={`tabular mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  step.done ? 'bg-kashi-500 text-white' : 'bg-white text-ink-500 ring-1 ring-inset ring-ink-300'
                }`}
              >
                {step.done ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${step.done ? 'text-ink-500 line-through decoration-ink-300' : 'text-ink-900'}`}>
                  {step.title}
                </span>
                <span className="mt-0.5 block text-sm text-ink-500">{step.text}</span>
              </span>
              <span className="hidden shrink-0 items-center gap-1 self-center text-sm font-medium text-brand-700 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                {step.action}
                <Icon name="chevronRight" className="h-4 w-4" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function WorkspaceFacts({ company, teamSize, role }) {
  const facts = [
    { label: 'Events per day', value: company.daily_event_capacity },
    { label: 'Team members', value: teamSize },
    { label: 'Your role', value: role },
  ]
  return (
    <Card title="Workspace">
      <dl className="divide-y divide-ink-100">
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-baseline justify-between py-3 first:pt-0 last:pb-0">
            <dt className="text-sm text-ink-500">{fact.label}</dt>
            <dd className="tabular text-sm font-semibold capitalize text-ink-900">
              {fact.value ?? <Skeleton className="h-4 w-8" />}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

export function DashboardPage() {
  const { user, company } = useAuth()
  const canSeeTeam = ['owner', 'manager'].includes(user.role)
  const [teamSize, setTeamSize] = useState(canSeeTeam ? null : undefined)
  const firstName = user.full_name.split(' ')[0]
  const modules = Object.values(MODULES).filter((module) => rolesFor(module.path).includes(user.role))

  useEffect(() => {
    if (!canSeeTeam) return
    api('/users')
      .then((users) => setTeamSize(users.length))
      .catch(() => setTeamSize(0))
  }, [canSeeTeam])

  return (
    <div className="space-y-8">
      <WelcomeBanner firstName={firstName} company={company} />

      <section aria-labelledby="modules-heading">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="modules-heading" className="font-display text-2xl text-ink-900">
            Your modules
          </h2>
          <Badge tone="brand" dot>
            Mid-term build
          </Badge>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard key={module.code} module={module} glaze={GLAZE[module.glaze]} />
          ))}
        </div>
      </section>

      {canSeeTeam && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SetupChecklist company={company} teamSize={teamSize ?? 0} />
          <WorkspaceFacts company={company} teamSize={teamSize} role={user.role} />
        </div>
      )}
    </div>
  )
}
