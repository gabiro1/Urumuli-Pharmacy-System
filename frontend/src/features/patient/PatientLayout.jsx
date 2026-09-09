import { useState } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import { PatientSidebar } from './components/PatientSidebar'
import { PatientTopNav } from './components/PatientTopNav'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { X } from 'lucide-react'

export function PatientLayout() {
  const location = useLocation()
  const { isAuthenticated } = usePatientAuthStore()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72"
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute -right-10 top-4 p-2 rounded-r-lg bg-sidebar border border-border border-l-0 text-sidebar-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <PatientSidebar onNavigate={() => setSidebarOpen(false)} />
          </motion.aside>
        </div>
      )}

      {!isMobile && (
        <aside className="hidden md:block w-72 shrink-0 overflow-hidden border-r border-border bg-sidebar">
          <PatientSidebar />
        </aside>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <PatientTopNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">
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
      </div>
    </div>
  )
}
