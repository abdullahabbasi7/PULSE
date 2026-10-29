import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Avatar } from '../components/ui/index.js'
import { ROLE_LABELS } from '../lib/roles.js'
import { Icon, PulseLogo } from './icons.jsx'
import { NAV_ITEMS, NAV_SECTIONS } from './nav.js'
import { EventBackdrop } from '../components/EventBackdrop.jsx'

// Sidebar links with a highlight that slides to the active page.
function SidebarNav({ items, onNavigate }) {
  const { pathname } = useLocation()
  const listRef = useRef(null)
  const [indicator, setIndicator] = useState(null)
  const settled = useRef(false)

  useLayoutEffect(() => {
    const active = listRef.current?.querySelector('a[aria-current="page"]')
    if (!active) {
      setIndicator(null)
      return
    }
    setIndicator({ top: active.offsetTop, height: active.offsetHeight, animate: settled.current })
    settled.current = true
  }, [pathname, items.length])

  return (
    <nav ref={listRef} className="relative flex-1 overflow-y-auto px-3 pb-6" aria-label="Main">
      {indicator && (
        <span
          className={`absolute left-3 right-3 rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-100 ${indicator.animate ? 'transition-[top,height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]' : ''}`}
          style={{ top: indicator.top, height: indicator.height }}
          aria-hidden="true"
        >
          <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-brand-600" />
        </span>
      )}
      {NAV_SECTIONS.filter((section) => items.some((item) => item.section === section.id)).map((section, index) => {
        const sectionItems = items.filter((item) => item.section === section.id)
        return (
          <div key={section.id} className={index === 0 ? 'mt-1' : 'mt-5'}>
            <p className="px-3 pb-1.5 text-xs font-medium text-ink-400">{section.label}</p>
            {sectionItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    isActive ? 'text-brand-800' : 'text-ink-600 hover:bg-ink-100/70 hover:text-ink-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      name={item.icon}
                      className={`h-5 w-5 transition-[color,transform] duration-300 group-hover:scale-110 ${isActive ? 'text-brand-600' : 'text-ink-400 group-hover:-rotate-6 group-hover:text-brand-600'}`}
                    />
                    <span className="flex-1 transition-transform duration-300 group-hover:translate-x-1">{item.label}</span>
                    {item.module && (
                      <span
                        className={`tabular rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                          isActive ? 'bg-white text-brand-700' : 'text-ink-400'
                        }`}
                      >
                        {item.module}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center px-6 pb-4 pt-6">
      <PulseLogo />
    </Link>
  )
}

function CompanyChip({ company }) {
  return (
    <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-2.5 ring-1 ring-inset ring-ink-200/70">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-glaze">
        <Icon name="building" className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink-900">{company.name}</p>
        <p className="truncate text-xs text-ink-500">{company.city || 'Company workspace'}</p>
      </div>
    </div>
  )
}

// Avatar button in the header that opens a small account menu.
function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-ink-100 sm:pr-3"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.full_name} src={user.avatar} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight text-ink-900">{user.full_name}</span>
          <span className="block text-xs leading-tight text-ink-500">{user.job_title || ROLE_LABELS[user.role]}</span>
        </span>
        <Icon name="chevronDown" className={`hidden h-4 w-4 text-ink-400 transition-transform duration-200 sm:block ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 origin-top-right animate-pop-in rounded-2xl bg-white p-2 shadow-pop ring-1 ring-ink-200/70"
        >
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar name={user.full_name} src={user.avatar} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{user.full_name}</p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
            </div>
          </div>
          <div className="my-1.5 h-px bg-ink-100" />
          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <Icon name="lock" className="h-4 w-4 text-ink-400" />
            Account &amp; password
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <Icon name="logout" className="h-4 w-4 text-ink-400" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function AppLayout() {
  const { user, company, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role))
  const current = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))

  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    document.title = current ? `${current.label} · PULSE` : 'PULSE'
  }, [current])

  return (
    <div className="relative min-h-screen lg:flex">
      <EventBackdrop className="z-0" lightsTop={64} />
      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-10 hidden h-screen w-72 shrink-0 flex-col border-r border-ink-200/70 bg-white/90 backdrop-blur lg:flex">
        <Brand />
        <CompanyChip company={company} />
        <SidebarNav items={items} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-ink-900/30 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[19rem] max-w-[85vw] animate-drawer-in flex-col bg-white shadow-pop">
            <div className="flex items-start justify-between pr-3">
              <Brand />
              <button
                type="button"
                className="mt-5 rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <CompanyChip company={company} />
            <SidebarNav items={items} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/60 bg-white/75 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6 lg:px-10">
          <button
            type="button"
            className="-ml-1 rounded-lg p-2 text-ink-600 transition-colors hover:bg-ink-100 lg:hidden"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="hidden truncate text-ink-500 sm:inline lg:hidden">{company.name}</span>
            <Icon name="chevronRight" className="hidden h-4 w-4 shrink-0 text-ink-300 sm:block lg:hidden" />
            <span className="truncate font-semibold text-ink-900">{current?.label ?? (location.pathname.startsWith('/account') ? 'Your account' : 'PULSE')}</span>
          </div>
          <UserMenu user={user} onSignOut={logout} />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {/* Re-keyed on navigation so each page eases in. */}
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
