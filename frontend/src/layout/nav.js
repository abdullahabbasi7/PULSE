// Sidebar items. `roles` decides who sees each page; App.jsx uses the same lists
// to protect the routes. `module` marks which FYP module owns the page.
const ALL = ['owner', 'manager', 'staff', 'driver', 'accounts']

export const NAV_SECTIONS = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'modules', label: 'Operations' },
  { id: 'admin', label: 'Administration' },
]

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', section: 'workspace', roles: ALL },
  { to: '/bookings', label: 'Bookings & Events', icon: 'calendar', section: 'modules', module: 'M1', roles: ['owner', 'manager', 'staff', 'driver'] },
  { to: '/inventory', label: 'Inventory', icon: 'box', section: 'modules', module: 'M2', roles: ['owner', 'manager', 'staff'] },
  { to: '/staff', label: 'Staff & Attendance', icon: 'badge', section: 'modules', module: 'M3', roles: ['owner', 'manager', 'accounts', 'staff'] },
  { to: '/team', label: 'Team Accounts', icon: 'users', section: 'admin', roles: ['owner', 'manager'] },
  { to: '/settings', label: 'Company Settings', icon: 'settings', section: 'admin', roles: ['owner'] },
]

export function rolesFor(path) {
  return NAV_ITEMS.find((item) => item.to === path)?.roles ?? ALL
}
