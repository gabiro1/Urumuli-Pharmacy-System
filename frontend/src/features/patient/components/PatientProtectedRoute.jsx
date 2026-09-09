import { Navigate, useLocation } from 'react-router-dom'
import { usePatientAuthStore } from '@/stores/patientAuthStore'

export function PatientProtectedRoute({ children }) {
  const { isAuthenticated } = usePatientAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
