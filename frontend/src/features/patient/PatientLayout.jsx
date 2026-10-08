import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Pill,
  Settings,
  ShoppingBag,
  Sun,
  Truck,
  UserRound,
  X,
  AlarmClock,
  ShieldCheck,
} from 'lucide-react'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import { Button } from '@/components/ui/button'
import { Logo, Logomark } from '@/components/shared/Logo'

const navigation = [
  { label: 'Overview', items: [{ label: 'Dashboard', to: '/patient', icon: LayoutDashboard, end: true }] },
  {
    label: 'Your care',
    items: [
      { label: 'Orders', to: '/patient/orders', icon: ShoppingBag },
      { label: 'Prescriptions', to: '/patient/prescriptions', icon: FileText },
      { label: 'Medicines', to: '/patient/medicines', icon: Pill },
      { label: 'Messages', to: '/patient/messages', icon: MessageCircle },
      { label: 'Refill reminders', to: '/patient/refill-reminders', icon: AlarmClock },
      { label: 'Delivery tracking', to: '/patient/delivery', icon: Truck },
      { label: 'Consent & privacy', to: '/patient/consent', icon: ShieldCheck },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', to: '/patient/profile', icon: UserRound },
      { label: 'Settings', to: '/patient/settings', icon: Settings },
    ],
  },
]

function PatientNavigation({ onNavigate }) {
  return (
    <nav aria-label="Patient portal" className="space-y-7">
      {navigation.map((section) => (
        <section key={section.label}>
          <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {section.label}
          </h2>
          <div className="space-y-1">
            {section.items.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
              </NavLink>
            ))}
          </div>
        </section>
      ))}
    </nav>
  )
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/patient/orders')) return 'Orders'
  if (pathname.startsWith('/patient/prescriptions')) return 'Prescriptions'
  if (pathname.startsWith('/patient/medicines')) return 'Medicines'
  if (pathname.startsWith('/patient/messages')) return 'Messages'
  if (pathname.startsWith('/patient/refill-reminders')) return 'Refill reminders'
  if (pathname.startsWith('/patient/delivery')) return 'Delivery tracking'
  if (pathname.startsWith('/patient/consent')) return 'Consent & privacy'
  if (pathname.startsWith('/patient/profile')) return 'Profile'
  if (pathname.startsWith('/patient/settings')) return 'Settings'
  return 'Dashboard'
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggle = () => {
    const nextIsDark = !isDark
    document.documentElement.classList.toggle('dark', nextIsDark)
    localStorage.setItem('theme-storage', JSON.stringify({ state: { theme: nextIsDark ? 'dark' : 'light' } }))
    setIsDark(nextIsDark)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={toggle}
      className="h-9 w-9 rounded-lg"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

export function PatientLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = usePatientAuthStore()

  useEffect(() => setMenuOpen(false), [location.pathname])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Patient'
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  const signOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/70 bg-card lg:flex">
        <Link to="/patient" className="flex h-[68px] items-center border-b border-border/70 px-6">
          <Logo className="h-8 w-8" />
        </Link>
        <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user?.email || 'Patient portal'}</span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <PatientNavigation />
        </div>
        <div className="border-t border-border/70 p-3">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-60">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <span className="lg:hidden"><Logomark className="h-8 w-8" /></span>
            <div className="flex min-w-0 items-center gap-2">
              <HeartPulse className="hidden h-[18px] w-[18px] text-primary sm:block" />
              <h1 className="truncate text-sm font-semibold sm:text-base">{getPageTitle(location.pathname)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="hidden rounded-lg sm:inline-flex">
              <Link to="/medicines"><Pill className="mr-2 h-4 w-4" />Find medicines</Link>
            </Button>
            <Link to="/patient/profile" aria-label="Your profile" className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
              {initials}
            </Link>
          </div>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 top-[68px] z-30 overflow-y-auto bg-background p-4 lg:hidden">
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initials}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user?.email || 'Patient portal'}</span>
              </span>
            </div>
            <PatientNavigation onNavigate={() => setMenuOpen(false)} />
            <Button variant="outline" className="mt-8 w-full justify-start gap-3" onClick={signOut}>
              <LogOut className="h-4 w-4" />Sign out
            </Button>
          </div>
        )}

        <main className="min-h-[calc(100vh-68px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
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
