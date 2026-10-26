import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Icon } from '../../layout/icons.jsx'

// Short confirmations ("Member added") that slide in at the bottom right.
// Usage:  const toast = useToast();  toast('Settings saved')  or  toast('Could not save', 'danger')
const ToastContext = createContext(() => {})

const STYLES = {
  success: { icon: 'check', ring: 'text-kashi-600 bg-kashi-50' },
  danger: { icon: 'alert', ring: 'text-red-600 bg-red-50' },
  info: { icon: 'info', ring: 'text-brand-600 bg-brand-50' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 220)
  }, [])

  const show = useCallback(
    (text, tone = 'success') => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-2), { id, text, tone, leaving: false }])
      setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6" aria-live="polite">
        {toasts.map((toast) => {
          const style = STYLES[toast.tone] || STYLES.info
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-white py-3 pl-3 pr-2 text-sm text-ink-800 shadow-pop ring-1 ring-ink-200/70 sm:w-auto sm:min-w-[18rem] ${toast.leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
              role={toast.tone === 'danger' ? 'alert' : 'status'}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.ring}`}>
                <Icon name={style.icon} className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="flex-1 font-medium">{toast.text}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="Dismiss"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
