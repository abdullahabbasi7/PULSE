import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { ROLE_LABELS } from '../lib/roles.js'
import { Icon, PulseMark } from './icons.jsx'
import { NAV_ITEMS } from './nav.js'

function SidebarContent({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Main">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
            }`
          }
        >
          <Icon name={item.icon} />
          <span className="flex-1">{item.label}</span>
          {item.module && <span className="text-[11px] font-semibold text-ink-400">{item.module}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-6 py-5 text-brand-600">
      <PulseMark />
      <span className="text-lg font-bold tracking-tight text-ink-900">PULSE</span>
    </div>
  )
}

export function AppLayout() {
  const { user, company, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  useEffect(() => setDrawerOpen(false), [location.pathname])

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-ink-200 bg-white md:flex md:flex-col">
        <Brand />
        <SidebarContent items={items} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-ink-900/40" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button className="rounded-lg p-2 text-ink-600 hover:bg-ink-100" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <SidebarContent items={items} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <button className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 md:hidden" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{company.name}</p>
            <p className="truncate text-xs text-ink-500">{company.city || 'Company workspace'}</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-ink-900">{user.full_name}</p>
            <p className="text-xs text-ink-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            onClick={logout}
          >
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
