// Motion helpers: Reveal (rise into view on scroll), Tilt (3D tilt with a holographic
// shine that follows the pointer) and CountUp (numbers that count up when seen).
// All of them switch off when the person prefers reduced motion.
import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from '../../lib/motion.js'

export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const seen = useInView(ref)
  const shown = reduced || seen
  return (
    <Tag
      ref={ref}
      className={`transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-6 opacity-0 blur-[2px]'
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Tilt({ className = '', max = 9, scale = 1.02, shine = true, children }) {
  const ref = useRef(null)
  const frame = useRef(0)
  const reduced = useReducedMotion()
  const [active, setActive] = useState(false)

  function onMove(event) {
    if (reduced || event.pointerType === 'touch') return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${(0.5 - y) * max * 2}deg`)
      el.style.setProperty('--ry', `${(x - 0.5) * max * 2}deg`)
      el.style.setProperty('--mx', `${x * 100}%`)
      el.style.setProperty('--my', `${y * 100}%`)
    })
    if (!active) setActive(true)
  }

  function onLeave() {
    const el = ref.current
    cancelAnimationFrame(frame.current)
    if (el) {
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
    setActive(false)
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  return (
    <div className="h-full [perspective:1000px]" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div
        ref={ref}
        className={`tilt relative h-full ${active ? 'tilt-active' : ''} ${className}`}
        style={{ '--scale': scale }}
      >
        {children}
        {shine && !reduced && <span className="holo pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden="true" />}
      </div>
    </div>
  )
}

const easeOut = (t) => 1 - (1 - t) ** 3

export function CountUp({ value, duration = 1100, className = '' }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const seen = useInView(ref)
  const target = typeof value === 'number' ? value : Number(value)
  const numeric = value !== null && value !== '' && Number.isFinite(target)
  const [shown, setShown] = useState(numeric && !reduced ? 0 : value)

  useEffect(() => {
    if (!numeric) {
      setShown(value)
      return undefined
    }
    if (reduced || !seen) {
      if (reduced) setShown(target)
      return undefined
    }
    let raf
    const start = performance.now()
    const from = 0
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(Math.round(from + (target - from) * easeOut(t)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, target, numeric, seen, reduced, duration])

  return (
    <span ref={ref} className={className}>
      {numeric ? Number(shown).toLocaleString('en-US') : value}
    </span>
  )
}
