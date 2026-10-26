import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'
import { Spinner } from '../components/ui/index.js'

// Wrap any page that needs a logged-in user. Pass `roles` to limit it further.
export function RequireAuth({ children, roles }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading PULSE" />
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
