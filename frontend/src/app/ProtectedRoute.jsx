import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, fetchProfile } = useAuthStore()
  const location = useLocation()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetchProfile()
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying your session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role) && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return children
}
