import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Menu,
  Sun,
  Moon,
  ChevronRight,
  Home,
  User,
  Settings,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'
import { usePatientAuthStore } from '@/stores/patientAuthStore'

const routeLabels = {
  messages: 'Messages',
  prescriptions: 'Prescriptions',
  medicines: 'Medicines',
  profile: 'Health Profile',
  settings: 'Settings',
}

function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean).slice(1)
  const visibleSegments = segments.filter((segment) => routeLabels[segment])

  if (visibleSegments.length === 0) return null

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Home className="h-3.5 w-3.5" />
      {visibleSegments.map((segment, index) => {
        const isLast = index === visibleSegments.length - 1
        return (
          <span key={segment} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className={cn(isLast ? 'text-foreground font-medium' : '')}>
              {routeLabels[segment]}
            </span>
          </span>
        )
      })}
    </nav>
  )
}

export function PatientTopNav({ onMenuClick }) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const { user, logout } = usePatientAuthStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
    : 'P'

  const handleLogout = async () => {
    setUserMenuOpen(false)
    await logout()
    navigate('/patient/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="shrink-0 text-muted-foreground hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden md:flex items-center min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={toggleTheme}
          className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 border border-border bg-muted hover:bg-accent shrink-0"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border transition-transform duration-300',
              theme === 'dark' ? 'translate-x-0.5' : 'translate-x-7'
            )}
          >
            {theme === 'dark' ? (
              <Moon className="h-3 w-3 text-foreground" />
            ) : (
              <Sun className="h-3 w-3 text-foreground" />
            )}
          </span>
        </button>

        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="rounded-full"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-primary/20 dark:bg-white/20 text-primary dark:text-foreground text-[10px] font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg"
              >
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-medium text-popover-foreground">
                    {user ? `${user.firstName} ${user.lastName}` : 'Patient'}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/patient/profile')
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                >
                  <User className="h-4 w-4" /> Profile
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/patient/settings')
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
