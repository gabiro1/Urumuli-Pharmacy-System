import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  FileText,
  Pill,
  Activity,
  ArrowRight,
  RotateCcw,
  Calendar,
  Shield,
  Clock,
  Sparkles,
  ChevronRight,
  Inbox,
  CheckCircle2,
  Send,
  Eye,
  TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import StatsCard from '@/components/shared/StatsCard'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const timeOfDay = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-12 w-12 rounded-lg mb-3" />
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-6 w-28" />
      </CardContent>
    </Card>
  )
}

export default function PatientDashboard() {
  const navigate = useNavigate()
  const { user } = usePatientAuthStore()

  const { data: conversations, isLoading: convLoading, isError, refetch } = useQuery({
    queryKey: ['patient-conversations'],
    queryFn: () => api.get('/chat/conversations?limit=5').then((r) => r.data),
  })

  const { data: prescriptionsData } = useQuery({
    queryKey: ['patient-prescriptions-summary'],
    queryFn: () => api.get('/prescriptions/my?limit=5').then((r) => r.data),
    enabled: !isError,
  })

  const conversationsList = conversations?.data || []
  const activeConvCount = conversationsList.filter((c) => c.status !== 'CLOSED').length
  const prescriptions = prescriptionsData?.data || []
  const pendingPrescriptions = prescriptions.filter(
    (p) => p.status === 'PENDING' || p.status === 'UNDER_REVIEW'
  ).length

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'P'

  if (convLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="p-4 rounded-full bg-destructive/10">
          <Activity className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Something went wrong while fetching your data. Please try again.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  const latestConversations = conversationsList.slice(0, 4)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6"
    >
      {/* ─── Hero Greeting ─── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background border border-border/50 p-6"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary dark:text-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="pt-1">
              <p className="text-sm text-muted-foreground">{timeOfDay()}</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {user?.firstName || 'Patient'} {user?.lastName || ''}
              </h1>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {today}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {activeConvCount > 0
                    ? `${activeConvCount} active conversation${activeConvCount !== 1 ? 's' : ''}`
                    : 'No pending messages'}
                </span>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 text-xs font-medium text-primary dark:text-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Patient Portal
          </div>
        </div>
      </motion.div>

      {/* ─── Stats Cards Row (clickable) ─── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => navigate('/patient/messages')}
          className="w-full text-left rounded-xl"
          aria-label="Open messages"
        >
          <StatsCard
            icon={MessageSquare}
            label="Active Conversations"
            value={activeConvCount}
            variant="primary"
            sub={activeConvCount > 0 ? `${conversationsList.length} total` : 'Start a conversation'}
            tooltip="Conversations awaiting your attention"
          />
        </button>
        <button
          type="button"
          onClick={() => navigate('/patient/prescriptions')}
          className="w-full text-left rounded-xl"
          aria-label="Open prescriptions"
        >
          <StatsCard
            icon={FileText}
            label="Total Prescriptions"
            value={prescriptions.length}
            variant="info"
            sub={pendingPrescriptions > 0 ? `${pendingPrescriptions} pending review` : 'All processed'}
            tooltip="Prescriptions you have submitted"
          />
        </button>
        <button
          type="button"
          onClick={() => navigate('/patient/orders')}
          className="w-full text-left rounded-xl"
          aria-label="Open orders"
        >
          <StatsCard
            icon={CheckCircle2}
            label="Approved"
            value={prescriptions.filter((p) => p.status === 'APPROVED' || p.status === 'COMPLETED').length}
            variant="success"
            progress={prescriptions.filter((p) => p.status === 'APPROVED' || p.status === 'COMPLETED').length}
            progressMax={Math.max(prescriptions.length, 1)}
            tooltip="Approved and completed prescriptions"
          />
        </button>
        <button
          type="button"
          onClick={() => navigate('/patient/prescriptions')}
          className="w-full text-left rounded-xl"
          aria-label="Open pending prescriptions"
        >
          <StatsCard
            icon={Eye}
            label="Pending Review"
            value={pendingPrescriptions}
            variant="warning"
            progress={pendingPrescriptions}
            progressMax={Math.max(prescriptions.length, 1)}
            tooltip="Prescriptions awaiting pharmacist review"
          />
        </button>
      </motion.div>

      {/* ─── Recent Activity + Health Summary ─── */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              Recent Conversations
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/patient/messages')}>
              View all <ChevronRight className="ml-0.5 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {latestConversations.length > 0 ? (
              <div className="space-y-1">
                {latestConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/patient/messages/${conv.id}`)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-all duration-200 group/item"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background',
                          conv.status === 'WAITING_PHARMACIST' && 'bg-yellow-400 ring-yellow-400/30',
                          conv.status === 'WAITING_PATIENT' && 'bg-green-400 ring-green-400/30',
                          conv.status === 'CLOSED' && 'bg-muted-foreground/40 ring-muted-foreground/20',
                          conv.status === 'OPEN' && 'bg-blue-400 ring-blue-400/30',
                          conv.status === 'ESCALATED' && 'bg-red-400 ring-red-400/30',
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{conv.subject}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {conv.context_type?.toLowerCase()} &middot;{' '}
                            {new Date(conv.updated_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          color={
                            conv.status === 'WAITING_PHARMACIST' ? 'yellow' :
                            conv.status === 'WAITING_PATIENT' ? 'green' :
                            conv.status === 'CLOSED' ? 'default' : 'blue'
                          }
                          className="shrink-0 text-[10px] px-1.5"
                        >
                          {conv.status === 'WAITING_PHARMACIST' ? 'Pending' :
                           conv.status === 'WAITING_PATIENT' ? 'Reply' :
                           conv.status === 'CLOSED' ? 'Closed' : 'Open'}
                        </Badge>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover/item:text-muted-foreground/50 transition-all duration-200" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs mt-1 mb-4">Start a conversation with your pharmacist</p>
                <Button size="sm" onClick={() => navigate('/patient/messages')}>
                  Start a conversation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Your Health Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => navigate('/patient/messages')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all duration-200 group/item"
            >
              <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 transition-transform duration-200 group-hover/item:scale-110">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Active Conversations</p>
                  <span className="text-lg font-bold tabular-nums text-foreground">{activeConvCount}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeConvCount > 0
                    ? `You have ${activeConvCount} conversation${activeConvCount !== 1 ? 's' : ''} awaiting attention`
                    : 'No active conversations. Reach out anytime.'}
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/patient/prescriptions')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all duration-200 group/item"
            >
              <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-transform duration-200 group-hover/item:scale-110">
                <FileText className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Prescriptions</p>
                  <span className="text-lg font-bold tabular-nums text-foreground">{prescriptions.length}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {prescriptions.length > 0
                    ? `${pendingPrescriptions} pending, ${prescriptions.length - pendingPrescriptions} processed`
                    : 'Upload a new prescription to get started'}
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/patient/medicines')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all duration-200 group/item"
            >
              <div className="p-2.5 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 transition-transform duration-200 group-hover/item:scale-110">
                <Pill className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-foreground">Medicine Catalog</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Browse medicines with safety and interaction info
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/patient/profile')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all duration-200 group/item"
            >
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 transition-transform duration-200 group-hover/item:scale-110">
                <Shield className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-foreground">Health Profile</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage your personal details and health preferences
                </p>
              </div>
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
