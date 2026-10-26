import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Badge, Card, PageHeader } from '../components/ui/index.js'
import { NAV_ITEMS } from '../layout/nav.js'

// Each module replaces its card's body with live numbers once its API is ready.
const MODULE_CARDS = {
  '/bookings': { owner: 'Abdullah', blurb: "Today's events, upcoming bookings and the live event board." },
  '/inventory': { owner: 'Amna', blurb: 'Crockery and equipment out on events, items due back, low stock.' },
  '/staff': { owner: 'Atiqa', blurb: "Who checked in today, who is absent, and each event's crew." },
}

export function DashboardPage() {
  const { user, company } = useAuth()
  const modules = NAV_ITEMS.filter((item) => item.module && item.roles.includes(user.role))
  const firstName = user.full_name.split(' ')[0]

  return (
    <>
      <PageHeader
        eyebrow={company.name}
        title={`Welcome back, ${firstName}`}
        description={`You can take up to ${company.daily_event_capacity} events per day. Change this in Company Settings.`}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((item) => (
          <Card key={item.to} title={item.label} actions={<Badge tone="brand">{item.module}</Badge>}>
            <p className="text-sm text-ink-600">{MODULE_CARDS[item.to].blurb}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-ink-400">Built by {MODULE_CARDS[item.to].owner}</span>
              <Link to={item.to} className="text-sm font-medium text-brand-700 hover:underline">
                Open
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
