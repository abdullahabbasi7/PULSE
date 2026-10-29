import { useRef } from 'react'
import { useInView, useReducedMotion } from '../../lib/motion.js'

// A white panel on the porcelain background. Use `title` for a header row.
// It rises into view each time it is scrolled to; pass reveal={false} to keep it still.
export function Card({ title, description, actions, children, className = '', bodyClassName = 'px-5 py-5 sm:px-6', reveal = true }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const seen = useInView(ref, { rootMargin: '0px 0px -4% 0px' })
  const shown = !reveal || reduced || seen
  return (
    <section
      ref={ref}
      className={`rounded-panel bg-white shadow-glaze ring-1 ring-ink-200/70 transition-[opacity,transform,box-shadow] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:shadow-lift ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-[0.95rem] font-semibold text-ink-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
