export function Card({ title, description, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl bg-white ring-1 ring-ink-200 ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-ink-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
