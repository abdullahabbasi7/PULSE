import { PulseMark } from '../layout/icons.jsx'

// Shared frame for the login and signup screens.
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-900 p-12 text-brand-50 lg:flex">
        <div className="flex items-center gap-2 text-brand-400">
          <PulseMark />
          <span className="text-lg font-bold tracking-tight text-white">PULSE</span>
        </div>
        <div>
          <p className="max-w-md text-3xl font-semibold leading-tight text-white [text-wrap:balance]">
            Every booking, dish and staff member for your events, in one place.
          </p>
          <p className="mt-4 max-w-md text-sm text-brand-200">
            Predictive Unified Logistics for Smart Events — built for catering and event companies.
          </p>
        </div>
        <p className="text-xs text-brand-300">SZABIST Islamabad · BS AI Final Year Project</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-brand-600 lg:hidden">
            <PulseMark />
            <span className="text-lg font-bold tracking-tight text-ink-900">PULSE</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
