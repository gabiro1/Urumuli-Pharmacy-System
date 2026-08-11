import { useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  Menu,
  Sun,
  Moon,
  Search,
  Bell,
  ChevronRight,
  Home,
  User,
  Settings,
  LogOut,
  CheckCheck,
  Loader2,
  BellOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const routeLabels = {
  app: '',
  '': 'Dashboard',
  inventory: 'Inventory',
  sales: 'Sales',
  prescriptions: 'Prescriptions',
  safety: 'Safety',
  'drug-checker': 'Drug Checker',
  search: 'Search',
  analytics: 'Analytics',
  audit: 'Audit Logs',
  admin: 'Admin',
}

function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const displaySegments = segments.filter(s => routeLabels[s] !== '')

  if (displaySegments.length === 0) return null

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Home className="h-3.5 w-3.5" />
      {displaySegments.map((segment, i) => {
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
        const isLast = i === displaySegments.length - 1
        return (
          <span key={segment} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className={cn(isLast ? 'text-foreground font-medium' : '')}>
              {label}
            </span>
          </span>
        )
      })}
    </nav>
  )
}

export function TopNav() {
  const { toggleSidebar, toggleCommandPalette } = useUIStore()
  const { theme, toggleTheme } = useThemeStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/unread-count').then((res) => res.data),
    refetchInterval: 30000,
    enabled: Boolean(user),
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=20').then((res) => res.data),
    enabled: Boolean(user) && notifOpen,
  })

  const notifications = notificationsQuery.data?.data || []
  const unread = unreadQuery.data?.data?.unread || 0

  async function markRead(id) {
    try {
      await api.put(`/notifications/${id}/read`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
    : 'U'

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="shrink-0 text-muted-foreground hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden md:flex items-center min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={toggleCommandPalette}
          className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors min-w-[200px]"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search medicines...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60">
            <span className="text-[9px]">⌘</span>K
          </kbd>
        </button>

        <button
          onClick={toggleTheme}
          className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 border border-border bg-muted hover:bg-accent shrink-0"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border transition-transform duration-300 ${
              theme === 'dark' ? 'translate-x-0.5' : 'translate-x-7'
            }`}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-foreground">
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-foreground">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </span>
        </button>

        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifOpen(!notifOpen)}
            className="text-muted-foreground hover:text-foreground relative"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center">
                <Badge variant="destructive" className="h-4 min-w-[14px] px-1 text-[9px]">
                  {unread > 9 ? '9+' : unread}
                </Badge>
              </span>
            )}
          </Button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover p-2 shadow-lg"
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-popover-foreground">Notifications</span>
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {notificationsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <BellOff className="w-6 h-6" />
                      <p className="text-sm">No notifications yet.</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => !notification.is_read && markRead(notification.id)}
                        className={cn(
                          'w-full rounded-lg px-3 py-2.5 text-left hover:bg-accent cursor-pointer transition-colors',
                          !notification.is_read && 'bg-primary/5'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-popover-foreground font-medium">{notification.title}</p>
                          {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                        </div>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1">{formatRelativeTime(notification.createdAt)}</p>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors">
                  <User className="h-4 w-4" /> Profile
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors">
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => useAuthStore.getState().logout()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
