// Animated preview of PULSE's three AI modules for the sign-in and sign-up panel.
// Everything is drawn in code (no stock images), so it stays sharp and loads instantly.
import { Tilt } from './ui/Motion.jsx'

function Sparkle({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
    </svg>
  )
}

// A decorative QR-style pattern (not a real code).
const QR_CELLS = (() => {
  const cells = []
  let seed = 7
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let y = 0; y < 13; y += 1) {
    for (let x = 0; x < 13; x += 1) {
      const finder = (x < 4 && y < 4) || (x > 8 && y < 4) || (x < 4 && y > 8)
      if (!finder && rand() > 0.52) cells.push([x, y])
    }
  }
  return cells
})()

function QrArt() {
  const finder = (x, y) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="3.4" height="3.4" rx="0.6" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <rect x={x + 1} y={y + 1} width="1.4" height="1.4" rx="0.3" fill="currentColor" />
    </g>
  )
  return (
    <svg viewBox="-0.5 -0.5 14 14" className="h-full w-full text-ink-900" aria-hidden="true">
      {finder(0, 0)}
      {finder(9.1, 0)}
      {finder(0, 9.1)}
      {QR_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.1} y={y + 0.1} width="0.8" height="0.8" rx="0.15" fill="currentColor" />
      ))}
    </svg>
  )
}

function FaceArt() {
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
      <span className="absolute inset-0 animate-ring-pulse rounded-full border-2 border-saffron-400" />
      <span className="absolute inset-0 rounded-full bg-saffron-50 ring-2 ring-saffron-300" />
      <svg viewBox="0 0 48 48" className="relative h-10 w-10 text-saffron-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="24" cy="19" r="8" />
        <path d="M10 41c2-8 7.5-12 14-12s12 4 14 12" />
        {/* the five landmarks the detector finds */}
        <circle cx="21" cy="18" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="27" cy="18" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="24" cy="21" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    </div>
  )
}

// A serving cloche with rising steam: the catering side of the product.
function ClocheArt({ className = '' }) {
  return (
    <svg viewBox="0 0 120 90" className={className} fill="none" strokeLinecap="round" aria-hidden="true">
      {[38, 60, 82].map((x, i) => (
        <path
          key={x}
          d={`M${x} 26c-4-5 4-8 0-13`}
          className="animate-steam stroke-brand-300"
          strokeWidth="2.5"
          style={{ animationDelay: `${i * 0.7}s` }}
        />
      ))}
      <path d="M16 70a44 38 0 0 1 88 0Z" className="fill-white stroke-brand-500" strokeWidth="2.5" />
      <path d="M30 60a30 28 0 0 1 22-24" className="stroke-brand-200" strokeWidth="3" />
      <circle cx="60" cy="31" r="4" className="fill-brand-500" />
      <path d="M8 72h104" className="stroke-brand-600" strokeWidth="4" />
      <path d="M22 79h76" className="stroke-kashi-400" strokeWidth="3" />
    </svg>
  )
}

function Card({ className = '', delay = 0, floatDelay = 0, children }) {
  return (
    <div className={`absolute animate-card-in ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="animate-float" style={{ animationDelay: `${floatDelay}s` }}>
        <Tilt max={12} scale={1.04} className="rounded-2xl">
          <div className="rounded-2xl bg-white/95 p-4 shadow-[0_18px_40px_-18px_rgba(31,44,105,0.35)] ring-1 ring-ink-200/70 backdrop-blur">
            {children}
          </div>
        </Tilt>
      </div>
    </div>
  )
}

const CHIPS = [
  { text: 'Mehndi', cls: 'bg-brand-50 text-brand-700 ring-brand-200' },
  { text: '14 Nov', cls: 'bg-brand-100 text-brand-800 ring-brand-200' },
  { text: '350 guests', cls: 'bg-saffron-100 text-saffron-900 ring-saffron-200' },
  { text: 'Marquee Grand', cls: 'bg-kashi-100 text-kashi-800 ring-kashi-200' },
]

export function AuthShowcase() {
  return (
    <div className="relative mx-auto h-[19.5rem] w-full max-w-[34rem] [@media(max-height:680px)]:hidden">
      {/* M1: inquiry reader */}
      <Card className="left-0 top-0 w-[19.5rem]" delay={700} floatDelay={0}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
          <Sparkle /> M1 · AI inquiry reader
        </p>
        <p className="mt-2 rounded-xl rounded-tl-sm bg-ink-50 px-3 py-2 text-[13px] leading-snug text-ink-700">
          “Beti ki mehndi hai 14 november ko, 350 mehman, Marquee Grand…”
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {CHIPS.map((chip, i) => (
            <span
              key={chip.text}
              className={`animate-chip-in rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${chip.cls}`}
              style={{ animationDelay: `${1300 + i * 220}ms` }}
            >
              {chip.text}
            </span>
          ))}
        </div>
      </Card>

      {/* M2: QR inventory */}
      <Card className="right-0 top-14 w-[13.5rem]" delay={950} floatDelay={1.4}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-kashi-700">M2 · QR inventory</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white p-1 ring-1 ring-ink-200">
            <QrArt />
            <span className="absolute inset-x-0 h-0.5 animate-scan bg-kashi-400 shadow-[0_0_8px_2px_rgba(51,184,184,0.6)]" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold leading-tight text-ink-900">120 ×</p>
            <p className="text-xs text-ink-500">Dinner plates sent out</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-ink-500">
          <span className="font-semibold text-brand-700">AI:</span> 593 needed for 400 guests
        </p>
      </Card>

      {/* M3: face attendance */}
      <Card className="bottom-0 left-10 w-[17rem]" delay={1200} floatDelay={2.6}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-saffron-700">M3 · Face check-in</p>
        <div className="mt-2 flex items-center gap-3">
          <FaceArt />
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">Welcome, Faisal</p>
            <p className="text-xs text-ink-500">Checked in 9:02 am</p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-kashi-50 px-2 py-0.5 text-[10px] font-semibold text-kashi-800 ring-1 ring-kashi-200">
              <span className="h-1.5 w-1.5 rounded-full bg-kashi-500" /> Liveness passed
            </p>
          </div>
        </div>
      </Card>

      <div className="absolute -bottom-2 right-2 w-28 animate-card-in" style={{ animationDelay: '1500ms' }}>
        <ClocheArt className="w-full" />
      </div>
    </div>
  )
}
