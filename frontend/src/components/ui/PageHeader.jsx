import { PhotoCredit, PhotoSlideshow } from '../EventPhotos.jsx'

// Page title in the display serif, with optional context line and actions.
// Pass `photos` to show the title over a banner of event photography.
export function PageHeader({ title, description, actions, context, photos }) {
  if (photos?.length) {
    return (
      <div className="relative mb-8 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand-100 via-brand-50 to-kashi-50 shadow-glaze ring-1 ring-brand-100">
        <PhotoSlideshow photos={photos} width={1400} interval={8000} />
        {/* A porcelain veil keeps the title easy to read over any photo. */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/20" />
        <div className="relative flex min-h-[11rem] flex-wrap items-end justify-between gap-4 px-6 py-7 sm:px-9">
          <div className="min-w-0 max-w-2xl">
            {context && <p className="mb-2 animate-page-in text-sm font-medium text-brand-700">{context}</p>}
            <h1 className="animate-page-in font-display text-[2rem] leading-tight text-ink-900 [animation-delay:100ms] sm:text-[2.4rem]">{title}</h1>
            {description && (
              <p className="mt-2 animate-page-in text-[0.95rem] leading-relaxed text-ink-600 [animation-delay:200ms]">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        <PhotoCredit className="absolute bottom-2 right-4 text-white/80 hover:text-white" />
      </div>
    )
  }
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
