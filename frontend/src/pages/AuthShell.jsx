import { KashiTiles } from '../components/KashiTiles.jsx'
import { PulseMark } from '../layout/icons.jsx'

const HIGHLIGHTS = [
  { title: 'Bookings that read themselves', text: 'Paste a client message and the event details fill in.' },
  { title: 'Every plate accounted for', text: 'QR-tracked crockery, with the right quantities predicted for each event.' },
  { title: 'Attendance by face', text: 'Staff check in at the venue with a glance at the camera.' },
]

// Shared frame for the login and signup screens: a cobalt tile panel and the form.
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="relative hidden overflow-hidden bg-brand-800 lg:block">
        <KashiTiles animate cols={9} rows={12} className="absolute inset-0 h-full w-full" />
        {/* Glaze light: brighter at the top, deeper towards the bottom where the text sits. */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(106,133,239,0.35),transparent_60%),linear-gradient(to_top,rgba(20,27,66,0.92)_25%,rgba(20,27,66,0.2)_75%)]" />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-2.5 text-white">
            <span className="text-white/95 [&_rect]:fill-white/15">
              <PulseMark className="h-10 w-10" />
            </span>
            <span className="font-display text-2xl tracking-wide">PULSE</span>
          </div>

          <div className="max-w-lg animate-page-in [animation-delay:500ms]">
            <h2 className="font-display text-[2.6rem] leading-[1.12] text-white xl:text-5xl">
              Run every wedding, mehndi and corporate dinner from one place.
            </h2>
            <ul className="mt-10 space-y-5">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex gap-3.5">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-kashi-400/20 text-kashi-200 ring-1 ring-kashi-300/40">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-brand-100/80">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-brand-200/70">Final Year Project, BS Artificial Intelligence, SZABIST Islamabad</p>
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
            <span className="font-display text-2xl tracking-wide text-ink-900">PULSE</span>
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
