// A white panel on the porcelain background. Use `title` for a header row.
export function Card({ title, description, actions, children, className = '', bodyClassName = 'px-5 py-5 sm:px-6' }) {
  return (
    <section className={`rounded-panel bg-white shadow-glaze ring-1 ring-ink-200/70 ${className}`}>
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
