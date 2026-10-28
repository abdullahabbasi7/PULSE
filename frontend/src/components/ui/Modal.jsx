import { useEffect, useRef } from 'react'
import { Icon } from '../../layout/icons.jsx'

// Dialog that slides up on phones and fades in on larger screens. Escape or the backdrop closes it.
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panelRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const previous = document.activeElement
    panelRef.current?.querySelector('input, select, textarea, button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 animate-fade-in bg-ink-900/40 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div
        ref={panelRef}
        className={`relative flex max-h-[92vh] w-full animate-rise-in flex-col rounded-t-3xl bg-white shadow-pop ring-1 ring-ink-200/70 sm:animate-pop-in sm:rounded-3xl ${width}`}
      >
        <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div>
            <h2 className="font-display text-2xl text-ink-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700" aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-6 py-4">{footer}</footer>}
      </div>
    </div>
  )
}
