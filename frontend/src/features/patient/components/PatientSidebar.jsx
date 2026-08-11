import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Home,
  FileText,
  User,
  Settings,
  Pill,
  ShoppingBag,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Logo } from '@/components/shared/Logo'
import { useState, useRef, useEffect } from 'react'

const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: Home, path: '/patient', end: true },
    ],
  },
  {
    label: 'Care',
    items: [
      { label: 'Messages', icon: MessageSquare, path: '/patient/messages' },
      { label: 'Prescriptions', icon: FileText, path: '/patient/prescriptions' },
      { label: 'My Orders', icon: ShoppingBag, path: '/patient/orders' },
      { label: 'Medicines', icon: Pill, path: '/patient/medicines' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', icon: User, path: '/patient/profile' },
      { label: 'Settings', icon: Settings, path: '/patient/settings' },
    ],
  },
]

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted/50'
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={cn(
              'h-5 w-5 shrink-0',
              isActive ? 'text-primary' : 'text-sidebar-foreground/50'
            )}
          />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

function Section({ label, items, onNavigate }) {
  return (
    <div>
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavItem key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}

export function PatientSidebar({ onNavigate }) {
  const { user, logout } = usePatientAuthStore()
  const navigate = useNavigate()
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

  const handleNavigate = (path) => {
    setUserMenuOpen(false)
    navigate(path)
    onNavigate?.()
  }

  const handleLogout = async () => {
    setUserMenuOpen(false)
    onNavigate?.()
    await logout()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="min-w-0">
          <Logo />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-sidebar-foreground/40">
            Patient Portal
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-6">
          {navSections.map((section) => (
            <Section
              key={section.label}
              label={section.label}
              items={section.items}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </div>

      <div ref={userMenuRef} className="relative border-t border-sidebar-border p-3">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-muted/50"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user ? `${user.firstName} ${user.lastName}` : 'Patient'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">patient</p>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-sidebar-foreground/40 transition-transform',
              userMenuOpen && 'rotate-180'
            )}
          />
        </button>

        {userMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-border bg-popover p-1 shadow-lg"
          >
            <button
              onClick={() => handleNavigate('/patient/profile')}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => handleNavigate('/patient/settings')}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
