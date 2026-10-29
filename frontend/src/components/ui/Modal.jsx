import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../layout/icons.jsx'

// Dialog rendered on top of the whole page (a portal into <body>, so page animations
// and scroll areas can never clip it or show through it). It slides up on phones and
// rises in on larger screens. Escape or the backdrop closes it; the page behind does
// not scroll while it is open.
export function Modal({ open, onClose, title, description, icon, children, footer, size = 'md', tone = 'brand' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector('input:not([type=hidden]), select, textarea')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size]

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 animate-fade-in bg-ink-900/45 backdrop-blur-[3px]" aria-label="Close" onClick={onClose} />
      <div
        ref={panelRef}
        className={`relative flex max-h-[92vh] w-full animate-rise-in flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-pop ring-1 ring-ink-200/70 sm:max-h-[88vh] sm:animate-pop-in sm:rounded-[1.75rem] ${width}`}
      >
        <header className="flex items-start gap-4 border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white px-6 pb-5 pt-6">
          {icon && (
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                tone === 'danger' ? 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-100' : 'bg-brand-600 text-white shadow-[0_6px_14px_-6px_rgba(48,72,201,0.6)]'
              }`}
            >
              <Icon name={icon} className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[1.6rem] leading-tight text-ink-900">{title}</h2>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 shrink-0 rounded-xl p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
