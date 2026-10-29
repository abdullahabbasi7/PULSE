// Background illustrations for the whole app: a festoon of string lights with twinkling
// bulbs, and line drawings of an event (chandelier, cloche, glasses, plate and cutlery,
// tiered cake, lantern, marquee tent). They float gently on their own and drift at
// different speeds as the page scrolls (parallax). Drawn in code: original, sharp, light.
import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../lib/motion.js'

const STROKE = { fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ART = {
  chandelier: (
    <g {...STROKE}>
      <path d="M50 2v18M30 20h40" />
      <path d="M18 38c6 10 22 12 32 4 10 8 26 6 32-4" />
      <path d="M30 20c-8 4-12 12-12 18M70 20c8 4 12 12 12 18M50 20v22" />
      {[18, 34, 50, 66, 82].map((x) => (
        <g key={x}>
          <path d={`M${x} ${x === 50 ? 42 : 38}v6`} />
          <path d={`M${x} ${x === 50 ? 48 : 44}c-3 4 3 8 0 12`} className="bulb" />
        </g>
      ))}
    </g>
  ),
  cloche: (
    <g {...STROKE}>
      <path d="M12 58a38 34 0 0 1 76 0z" />
      <path d="M26 48a24 22 0 0 1 16-18" />
      <circle cx="50" cy="20" r="4" />
      <path d="M4 62h92M14 68h72" />
    </g>
  ),
  glasses: (
    <g {...STROKE}>
      <path d="M22 10h22c0 18-4 26-11 28-7-2-11-10-11-28zM33 38v26M24 64h18" />
      <path d="M58 14h18c0 16-3 22-9 24-6-2-9-8-9-24zM67 38v26M59 64h16" />
      <path d="M44 8l6-6M48 14l8-2M46 20l7 3" />
    </g>
  ),
  plate: (
    <g {...STROKE}>
      <circle cx="50" cy="40" r="26" />
      <circle cx="50" cy="40" r="17" />
      <path d="M14 18v14c0 4 6 4 6 0V18M17 32v34" />
      <path d="M84 18c-6 4-6 18 0 20v28" />
    </g>
  ),
  cake: (
    <g {...STROKE}>
      <path d="M22 70h56V50H22zM30 50V34h40v16M38 34V22h24v12" />
      <path d="M22 58c6 4 10-4 16 0s10-4 16 0 10-4 16 0 8-2 8-2M30 41c5 3 8-3 13 0s9-3 14 0 9-3 13 0" />
      <path d="M50 22v-8" />
      <path d="M50 14c-2-3 2-6 0-9 3 2 3 6 0 9z" className="bulb" />
      <path d="M14 70h72" />
    </g>
  ),
  lantern: (
    <g {...STROKE}>
      <path d="M50 2v8M40 10h20l4 8H36zM38 18c-4 10-4 30 0 40h24c4-10 4-30 0-40" />
      <path d="M44 58v6h12v-6" />
      <path d="M50 30c-4 4-4 10 0 14 4-4 4-10 0-14z" className="bulb" />
    </g>
  ),
  tent: (
    <g {...STROKE}>
      <path d="M6 60L30 22h40l24 38" />
      <path d="M30 22l20 38 20-38M50 8v14" />
      <path d="M46 8l8 3-8 3" />
      <path d="M6 60h88M38 60l12-22 12 22" />
    </g>
  ),
}

// Each motif: where it sits, how big, its colour, how fast it drifts with scrolling.
const MOTIFS = [
  { art: 'chandelier', left: '62%', top: '44%', w: 130, tone: 'text-brand-200', depth: 0.06, float: 9, rot: -2 },
  { art: 'cloche', left: '86%', top: '28%', w: 120, tone: 'text-kashi-300', depth: 0.12, float: 11, rot: 4 },
  { art: 'glasses', left: '35%', top: '48%', w: 96, tone: 'text-saffron-300', depth: 0.18, float: 8, rot: -6 },
  { art: 'plate', left: '74%', top: '68%', w: 112, tone: 'text-brand-200', depth: 0.1, float: 12, rot: 6 },
  { art: 'cake', left: '48%', top: '84%', w: 104, tone: 'text-kashi-300', depth: 0.22, float: 10, rot: -3 },
  { art: 'lantern', left: '93%', top: '58%', w: 64, tone: 'text-saffron-300', depth: 0.28, float: 7, rot: 5 },
  { art: 'tent', left: '24%', top: '62%', w: 128, tone: 'text-brand-200', depth: 0.14, float: 13, rot: 2 },
]

function Festoon({ top = 0 }) {
  // A sagging wire with bulbs that twinkle one after another.
  const bulbs = Array.from({ length: 31 }, (_, i) => {
    const t = i / 30
    const x = t * 1200
    const y = 10 + Math.sin(t * Math.PI * 4) ** 2 * 16
    return { x, y, delay: (i % 7) * 0.45 }
  })
  const d = bulbs.map((b, i) => `${i ? 'L' : 'M'}${b.x.toFixed(0)} ${(b.y - 6).toFixed(1)}`).join(' ')
  return (
    <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="absolute inset-x-0 h-10 w-full opacity-80" style={{ top }} aria-hidden="true">
      <path d={d} fill="none" className="stroke-ink-200" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      {bulbs.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y - 1} r="4.5" className="twinkle fill-saffron-100" style={{ animationDelay: `${b.delay}s` }} />
          <circle cx={b.x} cy={b.y - 1} r="1.8" className={`twinkle-core ${i % 3 === 0 ? 'fill-kashi-300' : i % 3 === 1 ? 'fill-saffron-300' : 'fill-brand-300'}`} style={{ animationDelay: `${b.delay}s` }} />
        </g>
      ))}
    </svg>
  )
}

// A lighter set for the right half of the sign-in screens.
export const SIDE_MOTIFS = [
  { art: 'plate', left: '84%', top: '18%', w: 96, tone: 'text-brand-200', depth: 0.05, float: 9, rot: -2 },
  { art: 'glasses', left: '94%', top: '46%', w: 80, tone: 'text-saffron-300', depth: 0.1, float: 8, rot: -6 },
  { art: 'cake', left: '66%', top: '84%', w: 90, tone: 'text-kashi-300', depth: 0.12, float: 10, rot: 3 },
  { art: 'lantern', left: '60%', top: '30%', w: 52, tone: 'text-saffron-300', depth: 0.16, float: 7, rot: 5 },
]

export function EventBackdrop({ className = '', motifs = MOTIFS, lights = true, lightsTop = 0 }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return undefined
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => ref.current?.style.setProperty('--scroll', String(window.scrollY)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [reduced])

  return (
    <>
    {/* The lights hang at the top of the page and scroll away with it. */}
    {lights && (
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden ${className}`} aria-hidden="true">
        <Festoon top={lightsTop} />
      </div>
    )}
    <div ref={ref} className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {motifs.map((m, i) => (
        <div
          key={m.art + i}
          className={`absolute ${m.tone}`}
          style={{ left: m.left, top: m.top, width: m.w, transform: `translate3d(-50%, calc(var(--scroll, 0) * ${-m.depth}px), 0)` }}
        >
          <div className="backdrop-motif" style={{ animationDuration: `${m.float}s`, animationDelay: `${-i * 1.7}s`, '--rot': `${m.rot}deg` }}>
            <svg viewBox="0 0 100 72" className="h-auto w-full stroke-current opacity-70">
              {ART[m.art]}
            </svg>
          </div>
        </div>
      ))}
    </div>
    </>
  )
}
