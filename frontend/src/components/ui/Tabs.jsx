import { useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../../layout/icons.jsx'

// Segmented tabs with a highlight that slides to the selected tab.
export function Tabs({ tabs, value, onChange }) {
  const listRef = useRef(null)
  const [pill, setPill] = useState(null)
  const signature = tabs.map((t) => `${t.id}:${t.label}:${t.count ?? ''}`).join('|')
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return undefined
    const measure = () => {
      const el = list.querySelector('[aria-selected="true"]')
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    // Widths change when counts load or fonts finish loading.
    const observer = new ResizeObserver(measure)
    list.querySelectorAll('[role="tab"]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [value, signature])
  return (
    <div className="-mx-1 mb-6 overflow-x-auto px-1">
      <div ref={listRef} role="tablist" className="relative inline-flex gap-1 rounded-2xl bg-white p-1 shadow-glaze ring-1 ring-ink-200/70">
        {pill && (
          <span
            className="absolute inset-y-1 rounded-xl bg-brand-600 shadow-[0_1px_2px_rgba(20,27,66,0.25)] transition-[left,width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{ left: pill.left, width: pill.width }}
            aria-hidden="true"
          />
        )}
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === value}
            onClick={() => onChange(tab.id)}
            className={`relative z-10 inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ${
              tab.id === value ? 'text-white' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {tab.icon && <Icon name={tab.icon} className="h-4 w-4" />}
            {tab.label}
            {tab.count != null && (
              <span className={`tabular rounded-md px-1.5 text-[11px] ${tab.id === value ? 'bg-white/20' : 'bg-ink-100 text-ink-500'}`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
