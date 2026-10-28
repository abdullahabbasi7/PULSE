// Small outline icons on a 24px grid. Add new ones here as modules need them.
const PATHS = {
  dashboard: 'M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z',
  calendar: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  badge: 'M6 4h12v16H6zM9 9a3 3 0 106 0 3 3 0 10-6 0M8.5 17c.8-2 2-3 3.5-3s2.7 1 3.5 3',
  users: 'M8 11a3 3 0 100-6 3 3 0 000 6zM3 19c.7-3 2.6-5 5-5s4.3 2 5 5M16 11a3 3 0 100-6M18 14c1.6.6 2.6 2.4 3 5',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2 1-1 3-2.3-.3-1.4 1.4.3 2.3-3 1-1-2h-2l-1 2-3-1 .3-2.3-1.4-1.4L4 16l-1-3 2-1v-2L3 9l1-3 2.3.3 1.4-1.4L7.4 2.6l3-1 1 2h2l1-2 3 1-.3 2.3 1.4 1.4L20 6l1 3-2 1z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M4 4l16 16M10.6 6a9.6 9.6 0 011.4-.1c6 0 9.5 6.1 9.5 6.1a16 16 0 01-2.6 3.3M6.6 7.4A15.6 15.6 0 002.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 004.2 4.2',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  alert: 'M12 4l9 16H3zM12 10v4M12 17.2v.1',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 7.8v.1',
  building: 'M5 20V5l7-2v17M12 8h7v12M3 20h18M8 8v.1M8 11v.1M8 14v.1M15 11v.1M15 14v.1',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM6.5 6.5h1v1h-1zM16.5 6.5h1v1h-1zM6.5 16.5h1v1h-1z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 1112 0c0 5.5-6 11-6 11zM12 12a2 2 0 100-4 2 2 0 000 4z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z',
  refresh: 'M20 11a8 8 0 00-14.9-3.5M4 4v4h4M4 13a8 8 0 0014.9 3.5M20 20v-4h-4',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 016 0v3',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1.2-3.5 4.2-5.5 8-5.5s6.8 2 8 5.5',
  printer: 'M7 9V4h10v5M6 18H4v-7h16v7h-2M7 14h10v6H7z',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  play: 'M8 5v14l11-7z',
  history: 'M4 12a8 8 0 108-8 8 8 0 00-6.5 3.3M4 4v4h4M12 8v4l3 2',
  scan: 'M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16',
  chart: 'M5 19V9M10 19V5M15 19v-7M20 19v-4M3 19h18',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
}

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.7 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

export function PulseMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M5 17h5l3-7 4 13 3-9 2 3h5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
