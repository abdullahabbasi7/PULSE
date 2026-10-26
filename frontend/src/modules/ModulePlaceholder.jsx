import { Card, EmptyState, PageHeader } from '../components/ui/index.js'

// Temporary page for a module that is still being built. Replace it with the real screens.
export function ModulePlaceholder({ code, title, owner, description, features }) {
  return (
    <>
      <PageHeader eyebrow={`Module ${code} · ${owner}`} title={title} description={description} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EmptyState title="This module is under construction">
          {owner} is building these screens. The page, route and sidebar link are already wired up, so the work only
          happens inside this module's folder.
        </EmptyState>
        <Card title="Planned for the mid-term demo">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-600">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
