import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/Logo'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Menu, X, User, LayoutDashboard, Package, Settings2, LogOut } from 'lucide-react'
import { usePatientAuthStore } from '@/stores/patientAuthStore'

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof document === 'undefined') return 'dark'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme-storage', JSON.stringify({ state: { theme: next } }))
  }

  return (
    <button
      onClick={toggle}
      className="relative inline-flex h-9 w-14 items-center rounded-full transition-colors duration-300 border border-border bg-muted hover:bg-accent shrink-0 sm:w-16"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-[6px]' : 'translate-x-[26px] sm:translate-x-8'
        }`}
      >
        {theme === 'dark' ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-foreground">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-foreground">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
      </span>
    </button>
  )
}

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Products', path: '/medicines' },
  { label: 'Services', path: '/services' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
]

function PublicNavbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAuthenticated = usePatientAuthStore((state) => state.isAuthenticated)
  const user = usePatientAuthStore((state) => state.user)
  const logout = usePatientAuthStore((state) => state.logout)

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'P'

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const isActive = (path) => location.pathname === path
  const navLinkClass = (path) => `relative px-3 py-2 text-sm font-medium transition-colors duration-300 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-out ${
    isActive(path)
      ? 'text-foreground after:scale-x-100'
      : 'text-muted-foreground hover:text-foreground after:scale-x-0'
  }`

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen
          ? 'bg-background/80 backdrop-blur-xl border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="page-shell">
        <div className="flex h-16 items-center justify-between gap-2">
          <Logo className="h-8 w-8 shrink-0" />
          <div className="flex-1" />

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Open account menu"
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-primary/10 text-sm font-bold text-foreground transition-colors hover:bg-primary/20"
                  >
                    {initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {fullName || 'Patient'}
                      </span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/patient')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/patient/orders')}>
                    <Package className="mr-2 h-4 w-4" /> My orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/patient/profile')}>
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/patient/settings')}>
                    <Settings2 className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="hidden sm:inline-flex shrink-0">
                  Sign In
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate('/login')} aria-label="Sign In" className="sm:hidden shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 0 0-16 0" />
                  </svg>
                </Button>
              </>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden overflow-hidden bg-background/95 backdrop-blur-xl"
          >
            <div className="px-4 sm:px-6 pb-6 pt-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary/10 dark:bg-white/10 text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 sm:hidden">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Button className="w-full" onClick={() => navigate('/patient')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => navigate('/login')}>
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

export default PublicNavbar