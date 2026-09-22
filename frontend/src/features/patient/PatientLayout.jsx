import { useLocation, Navigate, Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'

export function PatientLayout() {
  const location = useLocation()
  const { isAuthenticated } = usePatientAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <PublicNavbar alwaysSolid />
      <main className="min-h-[calc(100vh-4rem)] pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <PublicFooter />
    </div>
  )
}
