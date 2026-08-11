import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion,
  useInView,
} from 'framer-motion'
import {
  FileText,
  MessageSquare,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle2,
  Users,
  Pill,
  Search,
  Activity,
  Layers,
  Bell,
  Heart,
  HeartPulse,
  Star,
  Zap,
  Building2,
  ShieldCheck,
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  ChevronDown,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/Logo'
import BackgroundBeams from '@/components/magicui/background-beams'
import {
  Card,
  CardContent,
} from '@/components/ui/card'

function TiltCard({ children, className }) {
  const cardRef = useRef(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    setRotateX((y - centerY) / 20)
    setRotateY((centerX - x) / 20)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('perspective-[1000px]', className)}
    >
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative transform-gpu"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, hsl(var(--primary)/0.3) 0%, transparent 60%)`,
          }}
        />
        {children}
      </motion.div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group"
    >
      <TiltCard>
        <div className="relative h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]">
          <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground">
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </TiltCard>
    </motion.div>
  )
}

function TourStep({ title, description, mockup, isActive }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6 }}
      className={cn(
        'flex flex-col lg:flex-row items-center gap-8 lg:gap-16 py-16 sm:py-20',
        isActive && 'opacity-100'
      )}
    >
      <div className="flex-1 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider">
          <Activity className="w-3 h-3" />
          Feature Highlight
        </div>
        <h3 className="text-3xl lg:text-4xl font-bold tracking-tight">
          {title}
        </h3>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
          {description}
        </p>
      </div>
      <div className="flex-1 w-full">{mockup}</div>
    </motion.div>
  )
}

function StaticDashboardPreview() {
  return (
    <motion.div
      animate={{
        rotate: [-0.35, 0.5, -0.35],
        opacity: [1, 0.92, 1],
      }}
      transition={{
        duration: 8,
        ease: 'easeInOut',
        repeat: Infinity,
      }}
      className="will-change-transform"
    >
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
        <img
          src="/urumuli-dashboard-preview.png"
          alt="Urumuli Pharmacy dashboard preview"
          className="block h-auto w-full"
          loading="lazy"
        />
      </div>
    </motion.div>
  )
}

// ─── Dashboard Mockup ─────────────────────────────────────────
const sidebarSections = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: LayoutDashboard, active: true }],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Inventory', icon: Pill },
      { label: 'Sales', icon: ShoppingCart },
      { label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Prescriptions',
    items: [{ label: 'All Prescriptions', icon: FileText }],
  },
  {
    label: 'Patient Care',
    items: [{ label: 'Inbox', icon: MessageSquare, badge: 3 }],
  },
  {
    label: 'System',
    items: [{ label: 'Admin', icon: Shield }],
  },
]

const barData = [
  { label: 'Jan', value: 45 },
  { label: 'Feb', value: 62 },
  { label: 'Mar', value: 38 },
  { label: 'Apr', value: 71 },
  { label: 'May', value: 55 },
  { label: 'Jun', value: 88 },
]

const lineData = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 25 },
  { label: 'Wed', value: 18 },
  { label: 'Thu', value: 30 },
  { label: 'Fri', value: 22 },
  { label: 'Sat', value: 8 },
  { label: 'Sun', value: 5 },
]

const recentData = [
  { initials: 'JM', name: 'Amoxicillin 500mg', status: 'Pending', color: 'yellow', time: '2 min ago' },
  { initials: 'AK', name: 'Metformin 850mg', status: 'Approved', color: 'green', time: '15 min ago' },
  { initials: 'RN', name: 'Atorvastatin 20mg', status: 'Completed', color: 'green', time: '1h ago' },
  { initials: 'PL', name: 'Omeprazole 20mg', status: 'Under Review', color: 'blue', time: '2h ago' },
  { initials: 'MT', name: 'Lisinopril 10mg', status: 'Approved', color: 'green', time: '3h ago' },
]

function AnimatedNumber({ value, duration = 1500 }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const startTime = performance.now()
    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  return <>{display}</>
}

function DashboardMockup() {
  const [loading, setLoading] = useState(true)
  const maxBarValue = Math.max(...barData.map((d) => d.value))
  const maxLineValue = Math.max(...lineData.map((d) => d.value))

  const linePath = lineData
    .map((d, i) => {
      const x = 4 + i * (192 / (lineData.length - 1))
      const y = 66 - (d.value / maxLineValue) * 56
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(t)
  }, [])

  const statCards = [
    { label: 'Total Prescriptions', value: 128, trend: '+12%', icon: FileText },
    { label: 'Pending Review', value: 12, sub: '8 need attention', icon: Clock },
    { label: 'Approved', value: 45, sub: '35% of total', icon: CheckCircle2 },
    { label: 'Conversations', value: 8, sub: '3 unread', icon: MessageSquare },
  ]

  return (
    <div className="relative w-full select-none rounded-xl border border-border/50 bg-card shadow-2xl overflow-hidden">
      {/* Window Chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <div className="ml-3 flex-1 max-w-[180px]">
          <div className="h-2 rounded-full bg-muted-foreground/15" />
        </div>
      </div>

      {/* Body */}
      <div className="flex" style={{ height: '480px' }}>
        {/* Sidebar */}
        <div className="hidden sm:flex w-[200px] shrink-0 flex-col border-r border-border/50 bg-muted/10">
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/50">
            <div className="w-6 h-6 rounded-lg bg-foreground flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Urumuli</span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
            {sidebarSections.map((section) => (
              <div key={section.label}>
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                        item.active
                          ? 'bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground'
                          : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/30'
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto w-4 h-4 rounded-full bg-primary/20 dark:bg-white/20 text-[8px] font-bold flex items-center justify-center text-primary dark:text-foreground">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 px-3 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/20 dark:bg-white/20 flex items-center justify-center text-[10px] font-bold text-primary dark:text-foreground shrink-0">
                DM
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate text-foreground">Dr. Mugisha</p>
                <p className="text-[9px] text-muted-foreground/60 truncate">Administrator</p>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground/40" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/30 flex-1 max-w-[200px]">
              <Search className="w-3 h-3 text-muted-foreground/50" />
              <span className="text-[11px] text-muted-foreground/50">Search prescriptions...</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Bell className="w-4 h-4 text-muted-foreground/60" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="w-6 h-6 rounded-full bg-primary/20 dark:bg-white/20 flex items-center justify-center text-[8px] font-bold text-primary dark:text-foreground">
                DM
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {loading ? (
              <>
                <div className="space-y-1.5">
                  <div className="h-6 w-28 rounded-lg animate-pulse bg-muted/60" />
                  <div className="h-3 w-44 rounded-lg animate-pulse bg-muted/60" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 rounded-xl animate-pulse bg-muted/60" />
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="h-44 rounded-xl animate-pulse bg-muted/60" />
                  <div className="h-44 rounded-xl animate-pulse bg-muted/60" />
                </div>
                <div className="h-36 rounded-xl animate-pulse bg-muted/60" />
              </>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.08 } },
                }}
                className="space-y-5"
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                  }}
                >
                  <h3 className="text-lg font-bold tracking-tight text-foreground">Dashboard</h3>
                  <p className="text-xs text-muted-foreground">Prescription and communication overview</p>
                </motion.div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {statCards.map((card) => (
                    <motion.div
                      key={card.label}
                      variants={{
                        hidden: { opacity: 0, y: 16 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                      }}
                      className="rounded-xl border border-border/40 bg-card p-3.5 space-y-1.5 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                          {card.label}
                        </span>
                        <card.icon className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tabular-nums text-foreground">
                          <AnimatedNumber value={card.value} />
                        </span>
                        {card.trend && (
                          <span className="text-[10px] font-medium text-green-500">{card.trend}</span>
                        )}
                      </div>
                      {card.sub && (
                        <p className="text-[10px] text-muted-foreground/60">{card.sub}</p>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Bar Chart */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                    }}
                    className="rounded-xl border border-border/40 bg-card p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Prescription Volume</p>
                        <p className="text-[10px] text-muted-foreground/60">Monthly comparison</p>
                      </div>
                      <Activity className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                    <div className="flex items-end justify-between gap-1.5 h-28">
                      {barData.map((bar) => {
                        const heightPct = (bar.value / maxBarValue) * 100
                        return (
                          <div key={bar.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${heightPct}%` }}
                              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                              className="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-primary/60 to-primary/30 dark:from-primary/50 dark:to-primary/20"
                              style={{ minHeight: '4px' }}
                            />
                            <span className="text-[8px] text-muted-foreground/50 font-medium">{bar.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>

                  {/* Line Chart */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                    }}
                    className="rounded-xl border border-border/40 bg-card p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Weekly Activity</p>
                        <p className="text-[10px] text-muted-foreground/60">Prescriptions per day</p>
                      </div>
                      <Activity className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                    <svg viewBox="0 0 200 70" className="w-full h-auto" style={{ overflow: 'visible' }}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={8 + i * 12}
                          x2="200"
                          y2={8 + i * 12}
                          stroke="hsl(var(--border))"
                          strokeWidth="0.5"
                          strokeDasharray="2 3"
                        />
                      ))}
                      <motion.path
                        d={`${linePath} L 196 66 L 4 66 Z`}
                        fill="url(#areaGrad)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                      <motion.path
                        d={linePath}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2, delay: 0.3, ease: 'easeInOut' }}
                      />
                      {lineData.map((d, i) => {
                        const x = 4 + i * (192 / (lineData.length - 1))
                        const y = 66 - (d.value / maxLineValue) * 56
                        return (
                          <motion.circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="3"
                            fill="hsl(var(--background))"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 1 + i * 0.08 }}
                          />
                        )
                      })}
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="flex justify-between mt-1">
                      {lineData.map((d) => (
                        <span key={d.label} className="text-[7px] text-muted-foreground/50">{d.label}</span>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Recent Activity */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                  }}
                  className="rounded-xl border border-border/40 bg-card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground/50" />
                      <span className="text-xs font-semibold text-foreground">Recent Prescriptions</span>
                    </div>
                    <span className="text-[10px] text-primary/70 font-medium">View all &rarr;</span>
                  </div>
                  <div className="space-y-1">
                    {recentData.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 1.3 + i * 0.08 }}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-default"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-white/10 flex items-center justify-center text-[8px] font-bold text-primary dark:text-foreground shrink-0">
                          {item.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium truncate text-foreground">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground/60">{item.time}</p>
                        </div>
                        <span
                          className={cn(
                            'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                            item.color === 'yellow' && 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
                            item.color === 'green' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                            item.color === 'blue' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          )}
                        >
                          {item.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PrescriptionFlowMockup() {
  return (
    <div className="relative w-full aspect-[4/3] rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <div className="ml-4 h-2 w-20 rounded-full bg-muted" />
      </div>
      <div className="flex items-center justify-between mb-6">
        {['Submitted', 'Under Review', 'Approved', 'Completed'].map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-1 flex-1">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
              i < 2 ? 'bg-primary/20 text-primary' : i === 2 ? 'bg-green-500/20 text-green-500' : 'bg-muted-foreground/20 text-muted-foreground'
            )}>
              {i + 1}
            </div>
            <div className="text-[9px] text-muted-foreground text-center">{step}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[
          { role: 'Patient', action: 'Uploaded prescription image', time: '10:32 AM' },
          { role: 'Pharmacist', action: 'Reviewed medication', time: '10:45 AM' },
          { role: 'System', action: 'No interactions found', time: '10:45 AM' },
          { role: 'Pharmacist', action: 'Approved prescription', time: '10:50 AM' },
        ].map((entry, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold',
              entry.role === 'Patient' ? 'bg-blue-500/20 text-blue-500' :
              entry.role === 'Pharmacist' ? 'bg-primary/20 text-primary' :
              'bg-muted-foreground/20 text-muted-foreground'
            )}>
              {entry.role[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] truncate">{entry.action}</div>
            </div>
            <div className="text-[9px] text-muted-foreground">{entry.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatMockup() {
  return (
    <div className="relative w-full aspect-[4/3] rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <div className="ml-4 h-2 w-24 rounded-full bg-muted" />
        <div className="ml-auto text-xs font-medium">Patient: Jean M.</div>
      </div>
      <div className="flex flex-col gap-2 h-[calc(100%-3rem)]">
        <div className="flex justify-start">
          <div className="max-w-[70%] p-2.5 rounded-xl rounded-tl-none bg-muted/40">
            <div className="text-[11px]">Bonjour, I need a refill for my blood pressure medication</div>
            <div className="text-[8px] text-muted-foreground mt-1">10:32 AM</div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[70%] p-2.5 rounded-xl rounded-tr-none bg-primary/20">
            <div className="text-[11px]">Of course, please send your prescription details</div>
            <div className="text-[8px] text-muted-foreground mt-1">10:35 AM</div>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[70%] p-2.5 rounded-xl rounded-tl-none bg-muted/40">
            <div className="text-[11px]">I've uploaded the image in my prescriptions</div>
            <div className="text-[8px] text-muted-foreground mt-1">10:38 AM</div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[70%] p-2.5 rounded-xl rounded-tr-none bg-primary/20">
            <div className="text-[11px]">Got it, I'll review it right away</div>
            <div className="text-[8px] text-muted-foreground mt-1">10:40 AM</div>
          </div>
        </div>
        <div className="mt-auto p-2 rounded-lg border border-border/50 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-muted-foreground/20" />
          <div className="h-5 w-12 rounded bg-primary/20 flex items-center justify-center text-[9px] text-primary">Send</div>
        </div>
      </div>
    </div>
  )
}



function LogoMarquee({ partners }) {
  const items = [...partners, ...partners]

  const partnerIcon = (type) => {
    if (type === 'PHARMACY') return HeartPulse
    if (type === 'INSURANCE') return ShieldCheck
    return Building2
  }

  return (
    <div className="relative mt-12 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex w-max items-center gap-14 animate-marquee hover:[animation-play-state:paused]">
          {items.map((partner, i) => {
            const Icon = partnerIcon(partner.partner_type)
            return (
              <a
                key={`${partner.id}-${i}`}
                href={partner.website_url || '#'}
                target={partner.website_url ? '_blank' : undefined}
                rel={partner.website_url ? 'noopener noreferrer' : undefined}
                className="flex shrink-0 items-center gap-2.5 text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt={partner.name}
                    className="h-8 w-auto max-w-[160px] object-contain"
                  />
                ) : (
                  <>
                    <Icon className="w-5 h-5" />
                    <span className="whitespace-nowrap text-xl font-bold tracking-tight">
                      {partner.name}
                    </span>
                  </>
                )}
              </a>
            )
          })}
        </div>
      </motion.div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const tourRef = useRef(null)
  const [featuredMedicines, setFeaturedMedicines] = useState([])
  const [medicinesLoading, setMedicinesLoading] = useState(true)
  const [activeSection, setActiveSection] = useState(() => window.location.hash.replace('#', ''))

  useEffect(() => {
    let cancelled = false
    api.get('/inventory/medicines?limit=6&isActive=true')
      .then((res) => {
        if (!cancelled) setFeaturedMedicines(res.data.data || [])
      })
      .catch(() => {
        if (!cancelled) setFeaturedMedicines([])
      })
      .finally(() => {
        if (!cancelled) setMedicinesLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const features = [
    {
      icon: FileText,
      title: 'Prescription Workflow',
      description:
        'End-to-end digital prescription management from patient submission to pharmacist review, approval, and completion.',
    },
    {
      icon: MessageSquare,
      title: 'Secure Messaging',
      description:
        'Encrypted real-time chat between patients and pharmacists for prescription inquiries, refills, and consultations.',
    },
    {
      icon: Shield,
      title: 'Drug Safety Checks',
      description:
        'Built-in interaction checker cross-references medications against known drug-drug and drug-allergy interactions.',
    },
    {
      icon: Clock,
      title: 'Status Tracking',
      description:
        'Patients track their prescriptions in real time — from PENDING to UNDER_REVIEW, APPROVED, and COMPLETED.',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description:
        'Automatic alerts when prescriptions are reviewed, approved, or when pharmacists send new messages.',
    },
    {
      icon: Pill,
      title: 'Medicine Catalog',
      description:
        'Comprehensive read-only medicine database with details on usage, dosage, side effects, and contraindications.',
    },
    {
      icon: Search,
      title: 'Audit Trail',
      description:
        'Immutable, tamper-proof audit logs tracking every prescription action and user activity for compliance.',
    },
    {
      icon: Users,
      title: 'Patient Portal',
      description:
        'Dedicated patient interface to submit prescriptions, track status, view history, and communicate with pharmacists.',
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description:
        'Role-based access control, encrypted data, and full audit trails keep every prescription safe and compliant.',
    },
  ]

  const benefits = [
    {
      icon: Zap,
      title: 'Faster Prescriptions',
      description: 'Patients get their medications faster with digital submission and real-time pharmacist review — no more waiting on phone calls or paper forms.',
    },
    {
      icon: Shield,
      title: 'Fewer Medication Errors',
      description: 'Built-in drug interaction checks and allergy alerts catch potential issues before they reach the patient.',
    },
    {
      icon: Heart,
      title: 'Better Patient Experience',
      description: 'Patients can track their prescriptions, message their pharmacist, and get updates — all from their phone.',
    },
    {
      icon: Star,
      title: 'Streamlined Pharmacy Operations',
      description: 'Pharmacists manage everything from a single dashboard: review prescriptions, chat with patients, and maintain compliance records.',
    },
  ]

  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated: isStaff, logout: staffLogout } = useAuthStore()
  const { isAuthenticated: isPatient, logout: patientLogout } = usePatientAuthStore()
  const isLoggedIn = isStaff || isPatient
  const userRole = isStaff ? 'staff' : isPatient ? 'patient' : null

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sections = ['features', 'tour']
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.25, 0.5] },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const handleLogout = () => {
    if (isStaff) staffLogout()
    if (isPatient) patientLogout()
  }

  const navLinkClass = (active = false) => `relative px-3 py-2 text-sm font-medium transition-colors duration-300 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-out ${
    active
      ? 'text-foreground after:scale-x-100'
      : 'text-muted-foreground hover:text-foreground after:scale-x-0'
  }`

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <div className="page-shell">
          <div className="flex h-16 items-center justify-between">
            <Logo />

            <div className="hidden md:flex items-center gap-2">
              <a href="#features" onClick={() => setActiveSection('features')} aria-current={activeSection === 'features' ? 'location' : undefined} className={navLinkClass(activeSection === 'features')}>Features</a>
              <a href="#tour" onClick={() => setActiveSection('tour')} aria-current={activeSection === 'tour' ? 'location' : undefined} className={navLinkClass(activeSection === 'tour')}>How It Works</a>
              <button onClick={() => navigate('/medicines')} className={navLinkClass()}>Medicines</button>
              <button onClick={() => navigate('/services')} className={navLinkClass()}>Services</button>
              <button onClick={() => navigate('/about')} className={navLinkClass()}>About</button>
              <button onClick={() => navigate('/contact')} className={navLinkClass()}>Contact</button>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/medicines')} className="md:hidden text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Medicines
              </button>
              <ThemeToggle />
              {isLoggedIn ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate(userRole === 'patient' ? '/patient' : '/app')} className="hidden sm:inline-flex">
                    Dashboard
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/patient/login')} className="hidden sm:inline-flex">
                    Patient Portal
                  </Button>
                  <Button size="sm" onClick={() => navigate('/login')}>
                    Staff Portal
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[96px]" />
      </div>

      {/* ========== HERO ========== */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center page-shell pt-20 pb-16"
      >
        <BackgroundBeams className="opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <div className="relative z-10 flex w-full flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 dark:border-white/20 bg-primary/5 dark:bg-white/10 text-sm text-primary dark:text-foreground mb-8"
        >
          <Layers className="w-4 h-4" />
          Prescription & Communication Platform
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-center max-w-5xl leading-tight tracking-tight"
        >
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Urumuli
          </span>
          <br />
          <span className="text-foreground">Prescription Portal</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 text-lg sm:text-xl text-muted-foreground text-center max-w-2xl leading-relaxed"
        >
          Connect patients with pharmacists through digital prescriptions,
          secure messaging, and real-time status tracking — all in one
          streamlined platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <Button
            size="lg"
            onClick={() => navigate('/patient/login')}
            className="h-12 px-8 text-base font-medium gap-2 group"
          >
            Patient Portal
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/login')}
            className="h-12 px-8 text-base font-medium gap-2"
          >
            Staff Portal
          </Button>
        </motion.div>

        {/* Floating Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 w-full max-w-4xl relative"
        >
          <StaticDashboardPreview />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-12 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Secure patient-pharmacist communication platform
        </motion.div>
        </div>
      </section>

      {/* ========== FEATURED MEDICINES ========== */}
      <section className="section-shell-tight relative border-y border-border/50">
        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Medicines We Provide
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Browse available medicines, pricing, prescription requirements, and product details.
            </p>
          </motion.div>

          {medicinesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : featuredMedicines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Medicines will appear here as soon as catalog items are available.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredMedicines.map((medicine) => (
                <article key={medicine.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="rounded-xl bg-primary/10 p-3 text-primary"><Pill className="h-6 w-6" /></div>
                    {medicine.requiresPrescription && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">Prescription required</span>}
                  </div>
                  <h3 className="text-lg font-semibold">{medicine.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{medicine.genericName || medicine.categoryName || 'Medicine'}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-semibold text-primary">{medicine.price != null ? `${Number(medicine.price).toLocaleString()} RWF` : 'Ask for price'}</span>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/medicines?q=${encodeURIComponent(medicine.name)}`)}>View details <ArrowRight className="ml-1 h-4 w-4" /></Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-10 text-center"><Button size="lg" onClick={() => navigate('/medicines')}>Browse all medicines <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" ref={featuresRef} className="section-shell relative">
        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Layers className="w-3 h-3" />
              Platform Features
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Everything You Need for{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Prescription Management
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
              From patient submission to pharmacist review and secure
              communication — every tool built for modern healthcare.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRODUCT TOUR ========== */}
      <section id="tour"
        ref={tourRef}
        className="section-shell relative border-y border-border/50"
      >
        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Activity className="w-3 h-3" />
              How It Works
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              See It in Action
            </h2>
          </motion.div>

          <div>
            <TourStep
              title="Dashboard Overview"
              description="Get a bird's-eye view of prescription activity — pending reviews, approval rates, and recent patient submissions at a glance."
              mockup={<StaticDashboardPreview />}
            />
            <TourStep
              title="Prescription Workflow"
              description="Patients submit prescriptions digitally. Pharmacists review, approve, or reject with full audit trails at every step."
              mockup={<PrescriptionFlowMockup />}
            />
            <TourStep
              title="Secure Communication"
              description="Encrypted real-time messaging between patients and pharmacists for refill requests, medication questions, and follow-ups."
              mockup={<ChatMockup />}
            />
          </div>
        </div>
      </section>

      {/* ========== WHY CHOOSE URUMULI ========== */}
      <section className="section-shell relative bg-gradient-to-b from-background via-primary/[0.02] to-background border-y border-border/50">
        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Heart className="w-3 h-3" />
              Why Choose Urumuli
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Better Care for Patients.{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Smarter Workflows for Pharmacists.
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
              Urumuli brings patients and pharmacists together on one platform — making
              prescription management faster, safer, and more convenient for everyone.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground shrink-0">
                      <benefit.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-6 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">No more paper prescriptions</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Real-time status updates</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Secure patient communication</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="section-shell relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        <div className="relative mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight leading-tight">
              Ready to Streamline{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Prescription Management?
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Patients can submit prescriptions and chat with their
              pharmacist. Staff can review, approve, and manage workflows.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/patient/register')}
                className="h-12 px-10 text-base font-medium gap-2 group"
              >
                Patient Portal
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/login')}
                className="h-12 px-10 text-base font-medium"
              >
                Staff Login
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <CheckCircle2 className="inline w-4 h-4 mr-1 text-green-500" />
              Secure &bull; HIPAA-compliant &bull; Built for modern healthcare
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-border/50 py-12">
        <div className="content-shell">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Pill className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-bold">Urumuli</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                A prescription and communication platform connecting patients
                with pharmacists for modern healthcare management.
              </p>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Quick Links</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Home', path: '/' },
                    { label: 'Services', path: '/services' },
                    { label: 'About Us', path: '/about' },
                    { label: 'Contact', path: '/contact' },
                  ].map((item) => (
                    <li key={item.label}>
                      <button onClick={() => navigate(item.path)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Portals</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Patient Portal', path: '/patient/login' },
                    { label: 'Staff Portal', path: '/login' },
                    { label: 'Patient Registration', path: '/patient/register' },
                    { label: 'Staff Registration', path: '/register' },
                  ].map((item) => (
                    <li key={item.label}>
                      <button onClick={() => navigate(item.path)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Support</h4>
                <ul className="space-y-2">
                  {['Help Center', 'FAQ', 'Privacy Policy', 'Terms of Service'].map((item) => (
                    <li key={item}>
                      <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Urumuli Pharmacy System. All rights reserved.</p>
            <div className="flex items-center gap-2 text-xs">
              <span>Connecting patients with pharmacists</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>v2.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

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
      className="relative inline-flex h-9 w-16 items-center rounded-full transition-colors duration-300 border border-border bg-muted hover:bg-accent"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-1' : 'translate-x-8'
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
