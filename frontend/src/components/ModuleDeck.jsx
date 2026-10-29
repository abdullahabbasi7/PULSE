// A fanned deck of the three module cards for the dashboard banner. The cards sway on
// their own and spread apart when the pointer is over the deck.
import { Link } from 'react-router-dom'
import { Icon } from '../layout/icons.jsx'

const CARDS = [
  { to: '/bookings', code: 'M1', title: 'Bookings', ai: 'Inquiry reader', icon: 'calendar', tile: 'bg-brand-600', ring: 'ring-brand-100', x: '-46px', r: '-9deg', xh: '-150px', rh: '-14deg', delay: '0s' },
  { to: '/inventory', code: 'M2', title: 'Inventory', ai: 'Equipment predictor', icon: 'box', tile: 'bg-kashi-500', ring: 'ring-kashi-100', x: '0px', r: '0deg', xh: '0px', rh: '0deg', delay: '0.9s' },
  { to: '/staff', code: 'M3', title: 'Attendance', ai: 'Face check-in', icon: 'badge', tile: 'bg-saffron-400', ring: 'ring-saffron-100', x: '46px', r: '9deg', xh: '150px', rh: '14deg', delay: '1.8s' },
]

export function ModuleDeck({ allowed }) {
  const cards = CARDS.filter((c) => allowed.includes(c.to))
  return (
    <div className="deck relative h-48 w-[22rem]" aria-label="Your AI modules">
      {cards.map((c, i) => (
        <Link
          key={c.code}
          to={c.to}
          className={`deck-card absolute left-1/2 top-2 -ml-[4.75rem] w-[9.5rem] rounded-2xl bg-white p-3.5 shadow-[0_20px_40px_-20px_rgba(31,44,105,0.45)] ring-1 ${c.ring} hover:shadow-[0_24px_48px_-18px_rgba(31,44,105,0.55)]`}
          style={{ '--x': c.x, '--r': c.r, '--xh': c.xh, '--rh': c.rh, animationDelay: c.delay, zIndex: i === 1 ? 3 : 2 }}
        >
          <div className="flex items-center justify-between">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${c.tile}`}>
              <Icon name={c.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="tabular text-[11px] font-semibold text-ink-400">{c.code}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-ink-900">{c.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-ink-500">
            <Icon name="sparkle" className="h-3 w-3 text-brand-500" />
            {c.ai}
          </p>
          <div className="mt-3 flex h-6 items-end gap-1" aria-hidden="true">
            {[40, 70, 52, 88, 64, 96].map((h, k) => (
              <span key={k} className={`flex-1 rounded-sm opacity-80 ${c.tile}`} style={{ height: `${h}%` }} />
            ))}
          </div>
        </Link>
      ))}
    </div>
  )
}
