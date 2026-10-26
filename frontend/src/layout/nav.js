// Sidebar items. `roles` decides who sees each page; App.jsx uses the same lists
// to protect the routes. `module` marks which FYP module owns the page.
const ALL = ['owner', 'manager', 'staff', 'driver', 'accounts']

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ALL },
  { to: '/bookings', label: 'Bookings & Events', icon: 'calendar', module: 'M1', roles: ['owner', 'manager', 'staff', 'driver'] },
  { to: '/inventory', label: 'Inventory', icon: 'box', module: 'M2', roles: ['owner', 'manager', 'staff'] },
  { to: '/staff', label: 'Staff & Attendance', icon: 'badge', module: 'M3', roles: ['owner', 'manager', 'accounts', 'staff'] },
  { to: '/team', label: 'Team Accounts', icon: 'users', roles: ['owner', 'manager'] },
  { to: '/settings', label: 'Company Settings', icon: 'settings', roles: ['owner'] },
]

export function rolesFor(path) {
  return NAV_ITEMS.find((item) => item.to === path)?.roles ?? ALL
}
