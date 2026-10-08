import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  RefreshCw,
  Truck,
  PackageCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowLeft,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  ClipboardList,
  RotateCcw,
  CalendarClock,
  Boxes,
  Undo2,
} from 'lucide-react'
import api from '@/lib/api'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/apiError'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatsCard from '@/components/shared/StatsCard'

// Mirrors backend/src/modules/delivery/deliveryState.js
const STATUS = {
  PENDING: 'PENDING',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
}

const STATUS_LABEL = {
  PENDING: 'Awaiting dispatch',
  PICKED_UP: 'Collected',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed attempt',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
}

const STATUS_COLOR = {
  PENDING: 'yellow',
  PICKED_UP: 'blue',
  IN_TRANSIT: 'blue',
  OUT_FOR_DELIVERY: 'purple',
  DELIVERED: 'green',
  FAILED: 'red',
  RETURNED: 'orange',
  CANCELLED: 'default',
}

const PROGRESS = [STATUS.PENDING, STATUS.PICKED_UP, STATUS.IN_TRANSIT, STATUS.OUT_FOR_DELIVERY, STATUS.DELIVERED]

const NEXT_STEPS = {
  PENDING: [STATUS.PICKED_UP],
  PICKED_UP: [STATUS.IN_TRANSIT],
  IN_TRANSIT: [STATUS.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [STATUS.DELIVERED],
  FAILED: [STATUS.PICKED_UP],
}

// Every legal target, offered as a secondary control so staff can correct a
// mistake without leaving the record.
const ALL_STEPS = [STATUS.PENDING, STATUS.PICKED_UP, STATUS.IN_TRANSIT, STATUS.OUT_FOR_DELIVERY, STATUS.DELIVERED, STATUS.FAILED, STATUS.RETURNED, STATUS.CANCELLED]

// The service requires a reason for these, so they open the reason dialog.
const NEEDS_REASON = [STATUS.FAILED, STATUS.RETURNED, STATUS.CANCELLED]

const SCOPES = [
  { value: 'open', label: 'Needs action' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'all', label: 'All records' },
]

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  )
}

function ProgressRail({ status }) {
  const isException = [STATUS.FAILED, STATUS.RETURNED, STATUS.CANCELLED].includes(status)
  const currentIndex = isException ? -1 : PROGRESS.indexOf(status)
  const delivered = status === STATUS.DELIVERED

  return (
    <ol className="flex items-center gap-1.5">
      {PROGRESS.map((step, index) => {
        const done = delivered || (currentIndex >= 0 && index < currentIndex)
        const active = !delivered && index === currentIndex
        return (
          <li key={step} className="flex flex-1 items-center gap-1.5">
            <div
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                done && 'bg-green-500',
                active && 'bg-primary',
                !done && !active && (isException ? 'bg-red-200 dark:bg-red-900/40' : 'bg-muted')
              )}
              title={STATUS_LABEL[step]}
            />
          </li>
        )
      })}
    </ol>
  )
}

function Timeline({ events = [] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events recorded yet.</p>
  }

  return (
    <ol className="relative space-y-4 pl-6">
      <span className="absolute left-[9px] top-1.5 bottom-1.5 w-px bg-border" aria-hidden="true" />
      {events.map((event, index) => {
        const isDelivery = event.source === 'DELIVERY'
        const failed = ['FAILED', 'RETURNED', 'CANCELLED'].includes(event.status)
        return (
          <li key={`${event.source}-${event.createdAt}-${index}`} className="relative">
            <span
              className={cn(
                'absolute -left-6 top-1 h-3 w-3 rounded-full ring-4 ring-background',
                failed ? 'bg-red-500' : isDelivery ? 'bg-green-500' : 'bg-muted-foreground/40'
              )}
            />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium">
                {isDelivery ? STATUS_LABEL[event.status] || event.status : event.status.replace(/_/g, ' ').toLowerCase()}
              </span>
              <Badge color={isDelivery ? STATUS_COLOR[event.status] || 'default' : 'default'} className="px-1.5 py-0 text-[10px]">
                {isDelivery ? 'Delivery' : 'Order'}
              </Badge>
              <span className="text-[11px] text-muted-foreground">{formatDate(event.createdAt)}</span>
            </div>
            {(event.note || event.actorName || event.actorRole === 'SYSTEM') && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {event.note}
                {event.note && (event.actorName || event.actorRole) ? ' — ' : ''}
                {event.actorName || (event.actorRole === 'SYSTEM' ? 'System' : null)}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default function DeliveryTrackingPage() {
  const queryClient = useQueryClient()
  const isStacked = useMediaQuery('(max-width: 1023px)')
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const canManage = hasPermission('delivery:manage')

  const [scope, setScope] = useState('open')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  // Handover dialog state
  const [handover, setHandover] = useState(null)
  const [receiverName, setReceiverName] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    setPage(1)
  }, [scope, status, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  const statsQuery = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: () => api.get('/delivery/stats').then((res) => res.data.data),
    refetchInterval: 30000,
  })

  const listQuery = useQuery({
    queryKey: ['deliveries', scope, status, page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '20', page: String(page), scope })
      if (status !== 'ALL') params.set('status', status)
      if (debouncedSearch) params.set('search', debouncedSearch)
      return api.get(`/delivery?${params.toString()}`).then((res) => ({
        data: res.data.data || [],
        meta: res.data.meta || {},
      }))
    },
    keepPreviousData: true,
    staleTime: 0,
    refetchInterval: 15000,
  })

  const deliveries = listQuery.data?.data || []
  const meta = listQuery.data?.meta || {}
  const total = meta.total ?? deliveries.length
  const totalPages = Math.max(1, meta.pages ?? 1)

  const timelineQuery = useQuery({
    queryKey: ['delivery-timeline', selectedOrderId],
    queryFn: () => api.get(`/delivery/order/${selectedOrderId}/timeline`).then((res) => res.data.data),
    enabled: Boolean(selectedOrderId),
  })

  const delivery = timelineQuery.data?.delivery
  const events = timelineQuery.data?.events || []

  const statusMutation = useMutation({
    mutationFn: ({ deliveryId, status: next, payload }) =>
      api.put(`/delivery/${deliveryId}/status`, { status: next, ...payload }),
    onSuccess: (res, variables) => {
      setHandover(null)
      setReceiverName('')
      setReason('')
      setNote('')
      setActionError('')
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-timeline'] })
      queryClient.invalidateQueries({ queryKey: ['order-queue'] })
      toast.success(
        variables.status === STATUS.DELIVERED ? 'Delivery confirmed and order completed' : res.data?.message || 'Delivery updated'
      )
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, 'Failed to update the delivery')
      setActionError(message)
      toast.error(message)
    },
  })

  const openHandover = (next) => {
    setActionError('')
    setReceiverName(delivery?.recipient_name || delivery?.patient_name || '')
    setReason('')
    setNote('')
    setHandover(next)
  }

  const confirmHandover = () => {
    if (!delivery || !handover) return
    if (handover === STATUS.DELIVERED && !receiverName.trim()) {
      setActionError('Record who received the parcel before confirming handover')
      return
    }
    if (NEEDS_REASON.includes(handover) && !reason.trim()) {
      setActionError('A reason is required for this outcome')
      return
    }
    const payload = handover === STATUS.DELIVERED ? { receiverName: receiverName.trim(), note: note.trim() || undefined } : { failureReason: reason.trim() }
    statusMutation.mutate({ deliveryId: delivery.id, status: handover, payload })
  }

  // One-click advance for the happy path; anything else routes through the dialog.
  const advance = (next) => {
    if (!delivery) return
    if (NEEDS_REASON.includes(next) || next === STATUS.DELIVERED) {
      openHandover(next)
      return
    }
    statusMutation.mutate({ deliveryId: delivery.id, status: next, payload: {} })
  }

  const stats = statsQuery.data
  const showList = !isStacked || !selectedOrderId
  const showDetail = !isStacked || Boolean(selectedOrderId)

  const address = useMemo(
    () => delivery?.delivery_address || delivery?.order_delivery_address || null,
    [delivery]
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deliveries</h1>
          <p className="text-muted-foreground mt-1">
            Every customer who ordered delivery, follow each parcel, and confirm handover.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Reference, customer, phone…"
              className="pl-9"
              aria-label="Search deliveries"
            />
          </div>
          <Select
            value={status !== 'ALL' ? status : scope}
            onValueChange={(value) => {
              if (ALL_STEPS.includes(value)) {
                setStatus(value)
                setScope('all')
              } else {
                setScope(value)
                setStatus('ALL')
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {SCOPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              {ALL_STEPS.map((step) => (
                <SelectItem key={step} value={step}>
                  {STATUS_LABEL[step]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => listQuery.refetch()}>
            <RefreshCw className={cn('w-4 h-4 mr-2', listQuery.isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Out for delivery"
          value={statsQuery.isLoading ? undefined : stats?.out_for_delivery ?? 0}
          sub="On the road to the customer now"
          variant="primary"
          icon={Truck}
        />
        <StatsCard
          label="Delivered today"
          value={statsQuery.isLoading ? undefined : stats?.delivered_today ?? 0}
          sub="Handovers confirmed today"
          variant="success"
          icon={PackageCheck}
        />
        <StatsCard
          label="Needs attention"
          value={statsQuery.isLoading ? undefined : stats?.needs_attention ?? 0}
          sub="Failed attempts awaiting a retry"
          variant="danger"
          icon={AlertTriangle}
        />
        <StatsCard
          label="Still in progress"
          value={statsQuery.isLoading ? undefined : stats?.in_progress ?? 0}
          sub={stats?.overdue ? `${stats.overdue} older than a day` : 'Awaiting dispatch or in transit'}
          variant="info"
          icon={Boxes}
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className={cn('grid gap-6 lg:h-[calc(100dvh-330px)] lg:min-h-[480px]', 'lg:grid-cols-[400px_minmax(0,1fr)]')}
      >
        {showList && (
          <Card className="flex flex-col overflow-hidden shadow-sm">
            <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0 border-b px-4 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Delivery queue
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {total} record{total === 1 ? '' : 's'}
              </span>
            </CardHeader>

            <ScrollArea className="flex-1">
              {listQuery.isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-3.5 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : deliveries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <PackageCheck className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">No delivery records</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {debouncedSearch
                      ? 'Nothing matches your search.'
                      : 'Parcels appear here as soon as a delivery order is placed.'}
                  </p>
                </div>
              ) : (
                <div>
                  {deliveries.map((row) => {
                    const isActive = row.order_id === selectedOrderId
                    const failed = row.status === STATUS.FAILED
                    return (
                      <button
                        key={row.id}
                        onClick={() => setSelectedOrderId(row.order_id)}
                        aria-label={`Open delivery for ${row.patient_name || 'customer'}`}
                        className={cn(
                          'w-full text-left border-b border-border/60 px-4 py-3.5 space-y-2 transition-colors hover:bg-muted/50',
                          isActive && 'bg-primary/5 hover:bg-primary/5',
                          failed && 'bg-red-50/50 hover:bg-red-50/70 dark:bg-red-500/5'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{row.patient_name || 'Unknown customer'}</p>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{row.public_reference}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.item_count} item{row.item_count === 1 ? '' : 's'}
                          {row.patient_phone ? ` · ${row.patient_phone}` : ''}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <Badge color={STATUS_COLOR[row.status] || 'default'} className="px-1.5 py-0 text-[10px]">
                            {STATUS_LABEL[row.status] || row.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {formatRelativeTime(row.dispatched_at || row.created_at)}
                          </span>
                        </div>
                        <ProgressRail status={row.status} />
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {totalPages > 1 && (
              <div className="shrink-0 flex items-center justify-between border-t px-4 py-2.5">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" disabled={page <= 1 || listQuery.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages || listQuery.isFetching} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {showDetail && (
          <Card className="flex flex-col overflow-hidden shadow-sm">
            {!selectedOrderId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <ClipboardList className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Select a delivery</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Pick a customer from the queue to see what they bought, where it is going, and confirm the handover.
                </p>
              </div>
            ) : timelineQuery.isLoading ? (
              <div className="flex-1 space-y-4 p-5">
                <Skeleton className="h-6 w-52" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : timelineQuery.isError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium">This delivery could not be loaded</p>
                <p className="text-xs text-muted-foreground max-w-xs">{getApiErrorMessage(timelineQuery.error)}</p>
                <Button variant="outline" size="sm" onClick={() => timelineQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : !delivery ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <p className="text-sm text-muted-foreground">No delivery record exists for this order.</p>
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b px-4 py-4 sm:px-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {isStacked && (
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedOrderId(null)}>
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    )}
                    <div className="h-10 w-10 shrink-0 rounded-full border border-border bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {initials(delivery.patient_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{delivery.patient_name || 'Unknown customer'}</p>
                      <p className="font-mono text-xs text-muted-foreground truncate">{delivery.public_reference}</p>
                    </div>
                    <Badge color={STATUS_COLOR[delivery.status] || 'default'}>
                      {STATUS_LABEL[delivery.status] || delivery.status}
                    </Badge>
                  </div>

                  <ProgressRail status={delivery.status} />

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      {delivery.item_count} item{delivery.item_count === 1 ? '' : 's'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {delivery.actual_delivery
                        ? `Delivered ${formatDate(delivery.actual_delivery)}`
                        : `Updated ${formatRelativeTime(delivery.dispatched_at || delivery.created_at)}`}
                    </span>
                    {delivery.attempt > 1 && (
                      <Badge color="orange" className="px-1.5 py-0 text-[10px]">
                        Attempt {delivery.attempt}
                      </Badge>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-5 px-4 py-5 sm:px-5">
                    {address && (
                      <div className="rounded-xl border bg-muted/40 p-3.5">
                        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          Deliver to
                        </p>
                        <p className="text-sm">{address}</p>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                          {delivery.patient_phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              {delivery.patient_phone}
                            </span>
                          )}
                          {delivery.tracking_number && (
                            <span className="flex items-center gap-1.5 font-mono">
                              <Truck className="h-3.5 w-3.5" />
                              {delivery.tracking_number}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {Array.isArray(delivery.items) && delivery.items.length > 0 && (
                      <div className="rounded-xl border p-3.5">
                        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <Package className="h-3.5 w-3.5" />
                          Contents
                        </p>
                        <ul className="space-y-1.5">
                          {delivery.items.map((item, index) => (
                            <li key={index} className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="truncate">{item.name || 'Medicine'}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {item.quantity ?? '—'} {item.sellingUnit || ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {delivery.status === STATUS.DELIVERED && (delivery.receiver_name || delivery.confirmation_note) && (
                      <div className="rounded-xl border border-green-200 bg-green-50/60 p-3.5 dark:border-green-900 dark:bg-green-950/30">
                        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Handover confirmed
                        </p>
                        {delivery.receiver_name && (
                          <p className="flex items-center gap-1.5 text-sm">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            Received by {delivery.receiver_name}
                          </p>
                        )}
                        {delivery.confirmation_note && <p className="mt-1 text-sm text-muted-foreground">{delivery.confirmation_note}</p>}
                      </div>
                    )}

                    {delivery.failure_reason && delivery.status !== STATUS.DELIVERED && (
                      <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5 dark:border-red-900 dark:bg-red-950/30">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Reason recorded
                        </p>
                        <p className="text-sm">{delivery.failure_reason}</p>
                      </div>
                    )}

                    {canManage && delivery.status !== STATUS.DELIVERED && (
                      <div className="rounded-xl border p-3.5 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update delivery</p>
                        <div className="flex flex-wrap gap-2">
                          {(NEXT_STEPS[delivery.status] || []).map((next) => (
                            <Button
                              key={next}
                              size="sm"
                              onClick={() => advance(next)}
                              disabled={statusMutation.isPending}
                            >
                              {statusMutation.isPending && statusMutation.variables?.status === next && (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              )}
                              {next === STATUS.DELIVERED
                                ? 'Mark as delivered'
                                : next === STATUS.PICKED_UP
                                  ? 'Confirm collected'
                                  : `Move to ${STATUS_LABEL[next].toLowerCase()}`}
                            </Button>
                          ))}
                        </div>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Record a different outcome
                          </summary>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {ALL_STEPS.filter((step) => step !== delivery.status).map((step) => (
                              <Button
                                key={step}
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs"
                                disabled={statusMutation.isPending}
                                onClick={() => advance(step)}
                              >
                                {step === STATUS.RETURNED && <Undo2 className="w-3 h-3 mr-1" />}
                                {step === STATUS.FAILED && <XCircle className="w-3 h-3 mr-1" />}
                                {STATUS_LABEL[step]}
                              </Button>
                            ))}
                          </div>
                        </details>
                        {actionError && (
                          <p role="alert" className="text-xs font-medium text-destructive">
                            {actionError}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Full history
                      </p>
                      <Timeline events={events} />
                    </div>
                  </div>
                </ScrollArea>
              </>
            )}
          </Card>
        )}
      </motion.div>

      {handover && delivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {handover === STATUS.DELIVERED ? (
                  <>
                    <PackageCheck className="h-5 w-5 text-green-600" />
                    Confirm handover
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Record {STATUS_LABEL[handover].toLowerCase()}
                  </>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {delivery.public_reference} · {delivery.patient_name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {handover === STATUS.DELIVERED ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    This records who took the parcel and completes the order. Stock is drawn down automatically.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="receiver">Received by</Label>
                    <Input
                      id="receiver"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Full name of the person who received it"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="handover-note">Note (optional)</Label>
                    <Textarea
                      id="handover-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Left with a neighbour, checked at the door…"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="failure-reason">Reason</Label>
                  <Textarea
                    id="failure-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Patient unavailable, wrong address, phone unreachable…"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">The customer is notified automatically.</p>
                </div>
              )}

              {actionError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setHandover(null)} disabled={statusMutation.isPending}>
                  Cancel
                </Button>
                <Button onClick={confirmHandover} disabled={statusMutation.isPending}>
                  {statusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {handover === STATUS.DELIVERED ? 'Confirm delivered' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  )
}
