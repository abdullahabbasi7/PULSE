// Small outline icons (24px grid). Add new ones here as modules need them.
const PATHS = {
  dashboard: 'M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z',
  calendar: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  badge: 'M6 4h12v16H6zM9 9a3 3 0 106 0 3 3 0 10-6 0M8.5 17c.8-2 2-3 3.5-3s2.7 1 3.5 3',
  users: 'M8 11a3 3 0 100-6 3 3 0 000 6zM3 19c.7-3 2.6-5 5-5s4.3 2 5 5M16 11a3 3 0 100-6M18 14c1.6.6 2.6 2.4 3 5',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2 1-1 3-2.3-.3-1.4 1.4.3 2.3-3 1-1-2h-2l-1 2-3-1 .3-2.3-1.4-1.4L4 16l-1-3 2-1v-2L3 9l1-3 2.3.3 1.4-1.4L7.4 2.6l3-1 1 2h2l1-2 3 1-.3 2.3 1.4 1.4L20 6l1 3-2 1z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
}

export function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export function PulseMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M5 17h5l3-7 4 13 3-9 2 3h5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
