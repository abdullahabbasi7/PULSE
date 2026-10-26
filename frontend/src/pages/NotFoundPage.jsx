import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/index.js'

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      action={
        <Link to="/dashboard" className="text-sm font-medium text-brand-700 hover:underline">
          Back to the dashboard
        </Link>
      }
    >
      This address doesn't match any page in PULSE.
    </EmptyState>
  )
}
