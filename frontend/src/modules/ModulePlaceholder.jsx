import { KashiTiles } from '../components/KashiTiles.jsx'
import { Badge, Card, PageHeader } from '../components/ui/index.js'
import { Icon } from '../layout/icons.jsx'
import { GLAZE } from './registry.js'

// Temporary page for a module that is still being built. Replace it with the real screens.
export function ModulePlaceholder({ module }) {
  const glaze = GLAZE[module.glaze]
  return (
    <>
      <PageHeader
        context={`Module ${module.code}, built by ${module.owner}`}
        title={module.title}
        description={module.summary}
        actions={<Badge tone="warning" dot>In development</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className={`relative overflow-hidden rounded-panel p-7 ring-1 ring-inset sm:p-8 ${glaze.soft}`}>
          <KashiTiles
            cols={5}
            rows={4}
            className="absolute -bottom-8 -right-8 h-56 w-72 opacity-70"
            starClass={glaze.stars}
            accentClass={glaze.stars}
            diamondClass={glaze.stars}
          />
          <div className="relative max-w-md">
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${glaze.tile}`}>
              <Icon name="sparkle" className="h-[22px] w-[22px]" />
            </span>
            <p className="mt-5 text-sm font-semibold">AI feature</p>
            <h2 className="mt-1 font-display text-[1.75rem] leading-tight text-ink-900">{module.ai.name}</h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-700">{module.ai.text}</p>
            <p className="mt-5 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-ink-700 ring-1 ring-ink-200/70">
              {module.ai.technique}
            </p>
          </div>
        </section>

        <Card title="Planned for the mid-term demo" description="The screens this module will have.">
          <ul className="space-y-3">
            {module.features.map((feature) => (
              <li key={feature} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${glaze.bar}`} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
