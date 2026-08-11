import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  CheckCircle,
  Clock,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Pill,
  TrendingDown,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BorderBeam } from '@/components/magicui/border-beam'
import { cn } from '@/lib/utils'

const TAB_ITEMS = [
  { id: 'overview', title: 'Overview', icon: LayoutDashboard },
  { id: 'prescriptions', title: 'Prescriptions', icon: FileText },
  { id: 'activity', title: 'Activity', icon: Activity },
  { id: 'conversations', title: 'Conversations', icon: MessageSquare },
  { id: 'inventory', title: 'Inventory', icon: Pill },
]

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

const screenFrame = 'flex min-h-[440px] w-full items-center justify-center overflow-hidden border border-border bg-card sm:aspect-[16/10] sm:min-h-0'

function OverviewScreen({ overview, prescriptions, inbox }) {
  const stats = [
    { label: 'Prescriptions', value: overview?.prescriptions?.total ?? prescriptions?.length ?? 0, icon: FileText },
    { label: 'Pending', value: (overview?.prescriptions?.pending ?? 0) + (overview?.prescriptions?.underReview ?? 0), icon: Clock },
    { label: 'Approved', value: overview?.prescriptions?.approved ?? 0, icon: CheckCircle },
    { label: 'Conversations', value: inbox?.length ?? 0, icon: MessageSquare },
  ]
  const barData = [
    { name: 'Pending', value: overview?.prescriptions?.pending ?? 0 },
    { name: 'Review', value: overview?.prescriptions?.underReview ?? 0 },
    { name: 'Approved', value: overview?.prescriptions?.approved ?? 0 },
    { name: 'Completed', value: overview?.prescriptions?.completed ?? 0 },
    { name: 'Rejected', value: overview?.prescriptions?.rejected ?? 0 },
  ].filter((d) => d.value > 0)

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Live overview</p>
        <Badge color="green" className="text-[10px]">Live</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-border bg-background p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Prescription status</p>
        {barData.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No prescription data yet</p>
        ) : (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

function PrescriptionsScreen({ overview }) {
  const statuses = [
    { key: 'pending', label: 'Pending', color: 'yellow' },
    { key: 'underReview', label: 'Review', color: 'blue' },
    { key: 'approved', label: 'Approved', color: 'green' },
    { key: 'completed', label: 'Completed', color: 'purple' },
    { key: 'rejected', label: 'Rejected', color: 'red' },
  ]
  const data = statuses
    .map((s) => ({ name: s.label, value: overview?.prescriptions?.[s.key] ?? 0 }))
    .filter((d) => d.value > 0)

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight">Prescription status</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {statuses.map((s) => (
            <Badge key={s.key} color={s.color} className="text-[10px]">
              {s.label}: {overview?.prescriptions?.[s.key] ?? 0}
            </Badge>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        {data.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No prescriptions yet</p>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityScreen({ prescriptions }) {
  const dayCounts = Array(7).fill(0)
  ;(prescriptions || []).forEach((rx) => {
    if (rx.createdAt) {
      const day = new Date(rx.createdAt).getDay()
      dayCounts[day]++
    }
  })
  const data = dayNames.map((name, i) => ({ name, value: dayCounts[i] }))
  const hasData = data.some((d) => d.value > 0)

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Weekly activity</p>
        <Badge color="blue" className="text-[10px]">7 days</Badge>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        {!hasData ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No recent activity yet</p>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="heroActivityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#heroActivityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationsScreen({ inbox }) {
  const list = inbox || []
  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Active conversations</p>
        <Badge className="text-[10px]">{list.length} open</Badge>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-2">
        {list.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No active conversations</p>
        ) : (
          list.slice(0, 5).map((conv) => (
            <div key={conv.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
              <div className="p-2 rounded-full bg-primary/10">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{conv.subject}</p>
                <p className="truncate text-[11px] text-muted-foreground">{conv.patientName}</p>
              </div>
              <Badge
                color={
                  conv.status === 'WAITING_PHARMACIST'
                    ? 'yellow'
                    : conv.status === 'OPEN'
                      ? 'blue'
                      : 'default'
                }
                className="text-[10px]"
              >
                {conv.status?.replace('_', ' ')}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function InventoryScreen({ overview }) {
  const items = overview?.inventory?.lowStockMedicines || []
  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Low stock alerts</p>
        <Badge color={items.length > 0 ? 'red' : 'green'} className="text-[10px]">
          {items.length > 0 ? `${items.length} alerts` : 'All healthy'}
        </Badge>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-2">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            <CheckCircle className="mx-auto mb-2 h-5 w-5" />
            All stock levels are healthy
          </p>
        ) : (
          items.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
              <div className="p-2 rounded-full bg-red-500/10">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{m.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {m.categoryName || 'Medicine'} · {m.current_stock} / {m.reorder_point ?? m.min_stock_level ?? 0} in stock
                </p>
              </div>
              <Badge color="red" className="text-[10px]">
                {m.stock_gap < 0 ? `${Math.abs(m.stock_gap)} below` : 'low'}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const SCREENS = {
  overview: OverviewScreen,
  prescriptions: PrescriptionsScreen,
  activity: ActivityScreen,
  conversations: ConversationsScreen,
  inventory: InventoryScreen,
}

export default function DashboardHero({ overview, prescriptions, inbox, loading }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(TAB_ITEMS[0].id)
  const activeIndex = Math.max(0, TAB_ITEMS.findIndex((t) => t.id === activeTab))
  const ActiveIcon = TAB_ITEMS[activeIndex].icon

  return (
    <section className="overflow-hidden">
      <div className="container">
        <div className="border-x border-border py-14 md:py-20">
          <div className="relative mx-auto max-w-4xl px-6 pt-4 pb-2 lg:p-2">
            <h1 className="mx-auto mt-6 max-w-4xl text-center text-3xl font-bold tracking-tight text-pretty md:text-4xl lg:text-5xl lg:tracking-tighter">
              Your pharmacy at a glance.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-muted-foreground md:text-base lg:text-xl">
              Track prescriptions, patient conversations, and stock levels in one place — with
              real-time insights to keep care moving.
            </p>
            <div className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
              <Button className="w-full sm:w-auto" onClick={() => navigate('/app/prescriptions/create')}>
                New prescription
              </Button>
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => navigate('/app/analytics')}>
                View analytics
              </Button>
            </div>
          </div>

          <div className="mt-10 md:mt-16">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="hidden md:block">
                <TabsList className="mx-auto mb-6 flex h-auto w-fit flex-wrap justify-center gap-2 p-1 lg:gap-3">
                  {TAB_ITEMS.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="gap-1.5 px-2 py-1 text-sm font-normal text-muted-foreground lg:gap-2 lg:px-3 lg:py-2 lg:text-base"
                      >
                        <Icon className="size-4 lg:size-5" aria-hidden />
                        {tab.title}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>

              <div className="relative isolate mx-auto w-full max-w-5xl">
                <div className="relative z-10">
                  {TAB_ITEMS.map((tab) => {
                    const Screen = SCREENS[tab.id]
                    return (
                      <TabsContent
                        key={tab.id}
                        value={tab.id}
                        className={cn(
                          '-mx-px transition-opacity duration-500',
                          activeTab === tab.id ? 'opacity-100' : 'opacity-0'
                        )}
                      >
                        {loading ? (
                          <div className={cn(screenFrame)}>
                            <div className="flex h-44 w-full max-w-xs items-center justify-center rounded-lg border border-border bg-background p-4">
                              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                            </div>
                          </div>
                        ) : (
                          <div className={screenFrame}>
                            <Screen overview={overview} prescriptions={prescriptions} inbox={inbox} />
                          </div>
                        )}
                        <BorderBeam duration={8} size={100} />
                      </TabsContent>
                    )
                  })}
                </div>
                <span className="absolute -inset-x-1/5 top-0 -z-10 h-px bg-border [mask-image:linear-gradient(to_right,transparent_1%,black_10%,black_90%,transparent_99%)]"></span>
                <span className="absolute -inset-x-1/5 bottom-0 -z-10 h-px bg-border [mask-image:linear-gradient(to_right,transparent_1%,black_10%,black_90%,transparent_99%)]"></span>

                <span className="absolute -inset-x-1/5 top-12 h-px border-t border-dashed border-border [mask-image:linear-gradient(to_right,transparent_1%,black_10%,black_90%,transparent_99%)]"></span>
                <span className="absolute -inset-x-1/5 bottom-12 h-px border-t border-dashed border-border [mask-image:linear-gradient(to_right,transparent_1%,black_10%,black_90%,transparent_99%)]"></span>

                <span className="absolute -inset-y-1/5 left-1/6 w-px border-r border-dashed border-border [mask-image:linear-gradient(to_bottom,transparent_1%,black_10%,black_90%,transparent_99%)]"></span>
                <span className="absolute -inset-y-1/5 right-1/6 w-px border-r border-dashed border-border [mask-image:linear-gradient(to_bottom,transparent_1%,black_10%,black_90%,transparent_99%)]"></span>
              </div>

              <nav
                className="mt-6 flex flex-col items-center gap-4 md:hidden"
                aria-label="Feature slides"
              >
                <div className="flex items-center gap-1.5" role="tablist">
                  {TAB_ITEMS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-label={tab.title}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        activeTab === tab.id
                          ? 'w-8 bg-foreground'
                          : 'w-1.5 bg-muted-foreground/40'
                      )}
                    />
                  ))}
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted">
                  <ActiveIcon key={activeTab} className="size-5 text-foreground" aria-hidden />
                </div>
              </nav>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  )
}
