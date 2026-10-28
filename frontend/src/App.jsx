import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth.jsx'
import { AppLayout } from './layout/AppLayout.jsx'
import { rolesFor } from './layout/nav.js'
import { LoginPage } from './pages/LoginPage.jsx'
import { SignupPage } from './pages/SignupPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { TeamPage } from './pages/TeamPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { AccountPage } from './pages/AccountPage.jsx'
import { PlatformApp } from './platform/PlatformApp.jsx' // PULSE team only
// Module pages — each member works inside their own folder.
import { BookingsPage } from './modules/bookings/BookingsPage.jsx' // M1 · Abdullah
import { InventoryPage } from './modules/inventory/InventoryPage.jsx' // M2 · Amna
import { AttendancePage } from './modules/attendance/AttendancePage.jsx' // M3 · Atiqa

function guarded(path, element) {
  return <RequireAuth roles={rolesFor(path)}>{element}</RequireAuth>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/platform/*" element={<PlatformApp />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bookings/*" element={guarded('/bookings', <BookingsPage />)} />
        <Route path="/inventory/*" element={guarded('/inventory', <InventoryPage />)} />
        <Route path="/staff/*" element={guarded('/staff', <AttendancePage />)} />
        <Route path="/team" element={guarded('/team', <TeamPage />)} />
        <Route path="/settings" element={guarded('/settings', <SettingsPage />)} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
