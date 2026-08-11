import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from '@/app/Sidebar'
import { TopNav } from '@/app/TopNav'
import { CommandPalette } from '@/app/CommandPalette'
import { useUIStore } from '@/stores/uiStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useEffect } from 'react'
import { X } from 'lucide-react'

export function DashboardLayout() {
  const location = useLocation()
  const { sidebarOpen, activityPanelOpen, toggleSidebar, commandPaletteOpen } = useUIStore()
  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useUIStore.getState().toggleCommandPalette()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={toggleSidebar}
          />
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed left-0 top-0 bottom-0 z-50"
          >
            <button
              onClick={toggleSidebar}
              className="absolute -right-10 top-4 p-2 rounded-r-lg bg-sidebar border border-border border-l-0 text-sidebar-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar />
          </motion.aside>
        </div>
      )}

      {!isMobile && (
        <motion.aside
          animate={{ width: sidebarOpen ? 240 : 64 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="hidden md:block shrink-0 overflow-hidden border-r border-border bg-sidebar"
        >
          <Sidebar />
        </motion.aside>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <TopNav />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
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

      {activityPanelOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="hidden lg:block shrink-0 border-l border-border bg-card"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Activity</h3>
            <button
              onClick={() => useUIStore.getState().toggleActivityPanel()}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 text-sm text-muted-foreground">
            <p>Recent activity will appear here.</p>
          </div>
        </motion.aside>
      )}

      <AnimatePresence>
        {commandPaletteOpen && <CommandPalette />}
      </AnimatePresence>

    </div>
  )
}
