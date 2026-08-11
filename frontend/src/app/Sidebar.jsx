import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  Pill,
  ShoppingCart,
  ScrollText,
  Shield,
  BarChart3,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Settings,
  User,
  MessageSquare,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Logo, Logomark } from '@/components/shared/Logo'
import { useState, useRef, useEffect } from 'react'

const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/app', end: true },
    ],
  },
  {
    label: 'Operations',
    roles: ['ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'AUDITOR'],
    items: [
      { label: 'Inventory', icon: Pill, path: '/app/inventory' },
      { label: 'Sales', icon: ShoppingCart, path: '/app/sales' },
      { label: 'Drug Checker', icon: ShieldCheck, path: '/app/safety/drug-checker' },
      { label: 'Analytics', icon: BarChart3, path: '/app/analytics' },
    ],
  },
  {
    label: 'Prescriptions',
    items: [
      { label: 'All Prescriptions', icon: FileText, path: '/app/prescriptions' },
    ],
  },
  {
    label: 'Patient Care',
    roles: ['ADMIN', 'PHARMACIST', 'MANAGER'],
    items: [
      { label: 'Inbox', icon: MessageSquare, path: '/app/inbox' },
      { label: 'Medicine Requests', icon: ShoppingCart, path: '/app/orders' },
    ],
  },
  {
    label: 'Contact',
    roles: ['ADMIN', 'MANAGER', 'PHARMACIST'],
    items: [
      { label: 'Contact Inbox', icon: MessageSquare, path: '/app/contact-inbox' },
    ],
  },
  {
    label: 'Compliance',
    roles: ['ADMIN', 'MANAGER', 'AUDITOR'],
    items: [
      { label: 'Audit Logs', icon: ScrollText, path: '/app/audit' },
    ],
  },
  {
    label: 'System',
    roles: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'Admin', icon: Shield, path: '/app/admin' },
      { label: 'Partners', icon: Building2, path: '/app/partners', roles: ['ADMIN'] },
    ],
  },
]

function NavItem({ item, collapsed }) {
  const location = useLocation()
  const isActive = item.end
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path)

  const link = (
    <NavLink
      to={item.path}
      end={item.end}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground'
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted/50'
      )}
    >
      <item.icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70')} />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="ml-2">
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

export function Sidebar() {
  const { sidebarOpen } = useUIStore()
  const { user, logout } = useAuthStore()
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

  const collapsed = !sidebarOpen

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
    : 'U'

  return (
    <div className="flex h-full flex-col">
        <div className={cn(
          'flex items-center gap-3 border-b border-sidebar-border px-4 py-4',
          collapsed && 'justify-center px-2'
        )}>
          {collapsed ? (
            <Logomark className="h-7 w-7" />
          ) : (
            <Logo />
          )}
        </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-6">
          {navSections.map((section) => {
            if (section.roles && user && !section.roles.includes(user.role) && user.role !== 'ADMIN') {
              return null
            }
            return (
              <div key={section.label}>
                {!collapsed && (
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {section.label}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items
                    .filter(
                      (item) =>
                        !item.roles ||
                        (user && (item.roles.includes(user.role) || user.role === 'ADMIN'))
                    )
                    .map((item) => (
                      <NavItem key={item.path} item={item} collapsed={collapsed} />
                    ))}
                </div>
              </div>
            )
          })}
        </nav>
      </div>

      <div ref={userMenuRef} className="relative border-t border-sidebar-border p-3">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-muted/50',
            collapsed && 'justify-center'
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-primary/20 dark:bg-white/20 text-primary dark:text-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {user?.role?.toLowerCase()}
                </p>
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 text-sidebar-foreground/40 transition-transform',
                userMenuOpen && 'rotate-180'
              )} />
            </>
          )}
        </button>

        {userMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className={cn(
              'absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-border bg-popover p-1 shadow-lg',
              collapsed && 'left-1 right-1'
            )}
          >
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
