import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'
import { PulseMark } from '../layout/icons.jsx'

// Wrap any page that needs a logged-in user. Pass `roles` to limit it further.
export function RequireAuth({ children, roles }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-brand-600" role="status">
        <PulseMark className="h-12 w-12 animate-pulse" />
        <span className="text-sm text-ink-500">Loading your workspace</span>
      </div>
    )
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
