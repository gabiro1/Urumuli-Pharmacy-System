import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Pill,
  Activity,
  Users,
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
import { formatRelativeTime } from '@/lib/utils'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import StatsCard from '@/components/shared/StatsCard'
import DashboardHero from '@/components/blocks/DashboardHero'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getStatusColor(status) {
  const colors = {
    PENDING: 'yellow',
    UNDER_REVIEW: 'blue',
    APPROVED: 'green',
    COMPLETED: 'purple',
    REJECTED: 'red',
  }
  return colors[status] || 'default'
}

function RecentPrescriptions({ prescriptions }) {
  const navigate = useNavigate()

  if (!prescriptions) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Recent Prescriptions
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/prescriptions')}>
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">No prescriptions yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Recent Prescriptions
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/prescriptions')}>
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[340px]">
            <div className="space-y-1">
              {prescriptions.map((rx, i) => {
                const initials = (rx.patientName || 'UN')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                return (
                  <motion.div
                    key={rx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/app/prescriptions/${rx.id}`)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rx.patientName}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(rx.createdAt)}</p>
                    </div>
                    <Badge color={getStatusColor(rx.status)} className="text-[10px] px-1.5 py-0">
                      {rx.status?.replace('_', ' ')}
                    </Badge>
                  </motion.div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function RecentConversations({ conversations }) {
  const navigate = useNavigate()

  if (!conversations) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (conversations.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Active Conversations
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/inbox')}>
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-6">No active conversations</p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            Active Conversations
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/inbox')}>
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[340px]">
            <div className="space-y-1">
              {conversations.map((conv, i) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/app/inbox/${conv.id}`)}
                >
                  <div className="p-2 rounded-full bg-primary/10 dark:bg-white/10">
                    <MessageSquare className="w-4 h-4 text-primary dark:text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.subject}</p>
                    <p className="text-xs text-muted-foreground">{conv.patientName}</p>
                  </div>
                  <Badge
                    color={
                      conv.status === 'WAITING_PHARMACIST'
                        ? 'yellow'
                        : conv.status === 'OPEN'
                          ? 'blue'
                          : 'default'
                    }
                  >
                    {conv.status?.replace('_', ' ')}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get('/analytics/overview?days=30').then((r) => r.data),
  })

  const { data: prescriptionsData, isLoading: rxLoading } = useQuery({
    queryKey: ['dashboard-prescriptions'],
    queryFn: () => api.get('/prescriptions?limit=10').then((r) => r.data),
  })

  const { data: inboxData, isLoading: inboxLoading } = useQuery({
    queryKey: ['dashboard-inbox'],
    queryFn: () => api.get('/chat/inbox?limit=5').then((r) => r.data),
  })

  const overview = overviewData?.data || {}
  const prescriptions = prescriptionsData?.data || []
  const inbox = inboxData?.data?.data || []
  const isLoading = overviewLoading || rxLoading || inboxLoading
  const hasData = !isLoading

  const stats = {
    total: overview.prescriptions?.total || prescriptions.length || 0,
    pending: (overview.prescriptions?.pending || 0) + (overview.prescriptions?.underReview || 0),
    approved: overview.prescriptions?.approved || 0,
    conversations: inbox.length,
  }

  const barChartData = [
    { name: 'Pending', value: overview.prescriptions?.pending || 0 },
    { name: 'Review', value: overview.prescriptions?.underReview || 0 },
    { name: 'Approved', value: overview.prescriptions?.approved || 0 },
    { name: 'Completed', value: overview.prescriptions?.completed || 0 },
    { name: 'Rejected', value: overview.prescriptions?.rejected || 0 },
  ].filter((d) => d.value > 0)

  const dayCounts = Array(7).fill(0)
  prescriptions.forEach((rx) => {
    if (rx.createdAt) {
      const day = new Date(rx.createdAt).getDay()
      dayCounts[day]++
    }
  })
  const lineChartData = dayNames.map((name, i) => ({ name, value: dayCounts[i] }))
  const hasLineData = lineChartData.some((d) => d.value > 0)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Hero */}
      <motion.div variants={itemVariants}>
        <DashboardHero
          overview={overview}
          prescriptions={prescriptions}
          inbox={inbox}
          loading={isLoading}
        />
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={FileText}
          label="Total Prescriptions"
          value={stats.total}
          variant="primary"
          tooltip="All prescriptions in the system"
        />
        <StatsCard
          icon={Clock}
          label="Pending Review"
          value={stats.pending}
          sub="Awaiting pharmacist review"
          variant="warning"
          progress={stats.pending}
          progressMax={Math.max(stats.total, 1)}
          tooltip="Prescriptions that need pharmacist attention"
        />
        <StatsCard
          icon={CheckCircle}
          label="Approved"
          value={stats.approved}
          variant="success"
          progress={stats.approved}
          progressMax={Math.max(stats.total, 1)}
          tooltip="Prescriptions approved and ready for dispensing"
        />
        <StatsCard
          icon={MessageSquare}
          label="Active Conversations"
          value={stats.conversations}
          variant="info"
          sub={stats.conversations > 0 ? `${inbox.filter((c) => c.status === 'WAITING_PHARMACIST').length || 0} need reply` : 'All caught up'}
          tooltip="Open conversations with patients"
        />
      </motion.div>

      {/* Charts Row */}
      {hasData && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Prescription Status
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              {barChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No prescription data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Line Chart */}
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              {!hasLineData ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No recent activity data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lineChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#activityGrad)"
                      animationDuration={1400}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Lists Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentPrescriptions prescriptions={prescriptionsData?.data} />
        <RecentConversations conversations={inboxData?.data} />
      </motion.div>
    </motion.div>
  )
}
