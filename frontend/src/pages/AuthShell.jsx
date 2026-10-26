import { KashiTiles } from '../components/KashiTiles.jsx'
import { PulseMark } from '../layout/icons.jsx'

// What the whole platform does, grouped from the 12 modules in the proposal.
const HIGHLIGHTS = [
  {
    title: 'Bookings, quotations and the live event board',
    text: 'Smart booking, menu recommendations and instant quotes, with every event of the day on one board.',
  },
  {
    title: 'Kitchen, inventory and fleet',
    text: 'Deep-learning demand forecasts, QR-tracked crockery and optimised delivery routes.',
  },
  {
    title: 'Staff, resources and finance',
    text: 'Face-recognition attendance, automatic resource allocation and an OCR ledger that flags unusual spending.',
  },
  {
    title: 'Clients and growth',
    text: 'An AI event concierge, generative decor designs, marketing automation and an owner command dashboard.',
  },
]

// The project name, with the letters that spell PULSE picked out.
const NAME = [
  ['P', 'redictive'],
  ['U', 'nified'],
  ['L', 'ogistics'],
  ['', 'for'],
  ['S', 'mart'],
  ['E', 'vents'],
]

// Shared frame for the login and signup screens: a light tile panel and the form.
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-100 via-brand-50 to-kashi-50 lg:block">
        <KashiTiles
          animate
          cols={9}
          rows={12}
          className="absolute inset-0 h-full w-full"
          starClass="stroke-brand-300/70"
          accentClass="stroke-kashi-400"
          diamondClass="stroke-brand-200"
        />
        {/* Clear porcelain behind the text so it stays easy to read. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(246,247,251,0.97)_30%,rgba(246,247,251,0.55)_62%,rgba(246,247,251,0)_90%)]" />

        <div className="relative flex h-full min-h-screen flex-col justify-between gap-10 p-12 xl:p-16 [@media(max-height:800px)]:py-9">
          <div className="flex items-center gap-2.5 text-brand-600">
            <PulseMark className="h-10 w-10" />
            <span className="font-display text-2xl tracking-wide text-ink-900">PULSE</span>
          </div>

          <div className="max-w-xl animate-page-in [animation-delay:500ms]">
            <h2 className="font-display text-[2.5rem] leading-[1.1] text-ink-900 xl:text-[2.9rem] [@media(max-height:800px)]:text-[2.25rem]">
              {NAME.map(([initial, rest]) => (
                <span key={rest} className="mr-[0.25em] inline-block">
                  {initial && <span className="text-brand-600">{initial}</span>}
                  {rest}
                </span>
              ))}
            </h2>
            <p className="mt-4 text-lg font-medium text-brand-800">An AI-Driven Management Platform for Catering Enterprises</p>
            <ul className="mt-9 space-y-4 [@media(max-height:800px)]:mt-7 [@media(max-height:800px)]:space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex gap-3.5">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-kashi-500 text-white">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-ink-500">Final Year Project, BS Artificial Intelligence, SZABIST Islamabad</p>
        </div>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden px-5 py-12 sm:px-8">
        {/* A faint corner of tiles on small screens, where the big panel is hidden. */}
        <KashiTiles
          cols={4}
          rows={3}
          className="absolute -right-16 -top-16 h-40 w-56 opacity-60 lg:hidden"
          starClass="stroke-brand-200"
          accentClass="stroke-kashi-300"
          diamondClass="stroke-brand-100"
        />
        <div className="relative w-full max-w-[25rem] animate-page-in">
          <div className="mb-10 flex items-center gap-2.5 text-brand-600 lg:hidden">
            <PulseMark className="h-10 w-10" />
            <div>
              <span className="font-display text-2xl tracking-wide text-ink-900">PULSE</span>
              <p className="text-xs text-ink-500">Predictive Unified Logistics for Smart Events</p>
            </div>
          </div>
          <h1 className="font-display text-[2.1rem] leading-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-2 text-[0.95rem] text-ink-500">{subtitle}</p>}
          <div className="mt-9">{children}</div>
          {footer && <div className="mt-8 border-t border-ink-100 pt-6 text-center text-sm text-ink-500">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
