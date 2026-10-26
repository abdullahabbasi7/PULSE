// Page title in the display serif, with optional context line and actions.
export function PageHeader({ title, description, actions, context }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {context && <p className="mb-2 text-sm font-medium text-brand-700">{context}</p>}
        <h1 className="font-display text-[2rem] leading-tight text-ink-900 sm:text-[2.25rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
