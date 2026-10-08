import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ClipboardList,
  FileText,
  HeartPulse,
  MessageCircle,
  PackageCheck,
  Pill,
  ShoppingBag,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PatientPageShell } from '../components/PatientPageShell'

const actionStatuses = new Set([
  'APPROVED_AWAITING_PATIENT_CONFIRMATION',
  'APPROVED_AWAITING_PAYMENT',
  'CLARIFICATION_REQUIRED',
])
const closedStatuses = new Set(['COMPLETED', 'CANCELLED', 'REJECTED_BY_PHARMACIST'])

const orderStatusLabels = {
  AWAITING_PRESCRIPTION: 'Prescription required',
  SUBMITTED_FOR_REVIEW: 'Submitted for review',
  UNDER_PHARMACIST_REVIEW: 'Pharmacist reviewing',
  CLARIFICATION_REQUIRED: 'Information needed',
  PRESCRIBER_CLARIFICATION_REQUIRED: 'Prescriber clarification',
  APPROVED_AWAITING_PATIENT_CONFIRMATION: 'Ready for your confirmation',
  APPROVED_AWAITING_PAYMENT: 'Ready for payment',
  PAYMENT_PROCESSING: 'Payment processing',
  PAYMENT_RECEIVED: 'Payment received',
  PAYMENT_DEFERRED: 'Pay on pickup',
  PREPARING: 'Being prepared',
  READY_FOR_PICKUP: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  COMPLETED: 'Completed',
  REJECTED_BY_PHARMACIST: 'Not approved',
  CANCELLED: 'Cancelled',
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : dateFormatter.format(date)
}

function SummaryCard({ icon: Icon, label, value, detail, tone }) {
  const tones = {
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  }

  return (
    <Card className="rounded-xl border-border/70 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex min-h-[126px] items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
          <p className="mt-2 text-[11px] text-muted-foreground sm:text-xs">{detail}</p>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </CardContent>
    </Card>
  )
}

function QueryError({ label, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center">
      <p className="text-sm text-destructive">{label} could not be loaded.</p>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={onRetry}>Try again</Button>
    </div>
  )
}

function OrderActivityChart({ orders, isLoading, isError, onRetry }) {
  const [range, setRange] = useState('6m')
  const months = useMemo(() => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const validDates = orders.map((order) => new Date(order.created_at)).filter((date) => !Number.isNaN(date.getTime()))
    const earliest = validDates.length
      ? new Date(Math.min(...validDates.map((date) => date.getTime())))
      : currentMonth
    const start = range === 'all'
      ? new Date(earliest.getFullYear(), earliest.getMonth(), 1)
      : new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (range === '6m' ? 5 : 11), 1)
    const result = []

    for (const cursor = new Date(start); cursor <= currentMonth; cursor.setMonth(cursor.getMonth() + 1)) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      result.push({
        key,
        label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(cursor),
        count: orders.filter((order) => {
          const date = new Date(order.created_at)
          return !Number.isNaN(date.getTime()) &&
            date.getFullYear() === cursor.getFullYear() &&
            date.getMonth() === cursor.getMonth()
        }).length,
      })
    }
    return result
  }, [orders, range])

  const maxCount = Math.max(1, ...months.map((month) => month.count))
  const rangeOptions = [['6m', '6M'], ['1y', '1Y'], ['all', 'ALL']]

  return (
    <Card className="min-w-0 rounded-xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <CardTitle className="text-base">Order activity</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Your medicine orders over time</p>
        </div>
        <div role="group" aria-label="Order activity range" className="flex items-center rounded-lg bg-muted/70 p-1">
          {rangeOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={range === value}
              onClick={() => setRange(value)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors duration-200 ${
                range === value ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 px-5 py-5 sm:px-6">
        {isError ? (
          <QueryError label="Order activity" onRetry={onRetry} />
        ) : isLoading ? (
          <Skeleton className="h-52 w-full rounded-xl" />
        ) : orders.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground"><ShoppingBag className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-semibold">Your order activity will appear here</p>
            <p className="mt-1 text-xs text-muted-foreground">Once you place an order, you can follow its progress here.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-end gap-2">
              <span className="text-2xl font-semibold tabular-nums">{orders.length}</span>
              <span className="pb-1 text-xs text-muted-foreground">total orders</span>
            </div>
            <div className="overflow-x-auto pb-1">
              <div
                className="grid h-44 min-w-[440px] items-end gap-2 border-b border-border/70 px-1 sm:min-w-0 sm:gap-3"
                style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
                role="img"
                aria-label={`Monthly order counts: ${months.map((month) => `${month.label} ${month.count}`).join(', ')}`}
              >
                {months.map((month) => (
                  <div key={month.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] tabular-nums text-muted-foreground">{month.count || ''}</span>
                    <div className="flex h-[118px] w-full items-end justify-center rounded-t-md bg-muted/35">
                      <div
                        className="w-[min(72%,36px)] rounded-t-md bg-gradient-to-t from-violet-600 to-violet-400 transition-[height] duration-300"
                        style={{ height: `${month.count ? Math.max(10, (month.count / maxCount) * 100) : 3}%` }}
                        title={`${month.label}: ${month.count} orders`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{month.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CareFocus({ orders, isLoading, isError, onRetry }) {
  const focusOrder = [...orders]
    .sort((a, b) => Number(actionStatuses.has(b.status)) - Number(actionStatuses.has(a.status)))
    .find((order) => !closedStatuses.has(order.status))
  const needsAction = focusOrder && actionStatuses.has(focusOrder.status)
  const today = new Date()

  return (
    <Card className="rounded-xl border-border/70 bg-card shadow-sm">
      <CardHeader className="border-b border-border/60 px-5 py-4">
        <CardTitle className="text-base">Your care</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">The latest from your pharmacy</p>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 rounded-xl bg-violet-500/5 p-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <span className="text-center">
              <span className="block text-[9px] font-semibold uppercase tracking-wide">{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(today)}</span>
              <span className="block text-lg font-bold leading-5">{today.getDate()}</span>
            </span>
          </span>
          <span>
            <span className="block text-sm font-semibold">Today</span>
            <span className="block text-xs text-muted-foreground">
              {new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(today)}
            </span>
          </span>
        </div>
        {isError ? (
          <div className="mt-4"><QueryError label="Your care overview" onRetry={onRetry} /></div>
        ) : isLoading ? (
          <div className="mt-4 space-y-3"><Skeleton className="h-14 rounded-lg" /><Skeleton className="h-9 rounded-lg" /></div>
        ) : focusOrder ? (
          <Link to={`/orders/${focusOrder.id}`} className="group mt-4 block rounded-xl border border-border/70 p-3 transition-colors duration-200 hover:border-primary/30 hover:bg-muted/40">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <HeartPulse className="h-3.5 w-3.5 text-primary" />
              {needsAction ? 'Next step' : 'Latest order'}
            </span>
            <span className="mt-2 block truncate text-sm font-semibold">{focusOrder.public_reference || 'Medicine order'}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {orderStatusLabels[focusOrder.status] || focusOrder.status?.replaceAll('_', ' ')}
            </span>
            <span className="mt-3 inline-flex items-center text-xs font-semibold text-primary">
              View order <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-sm font-semibold">No active pharmacy updates</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">When you order medicine or send a prescription, updates will appear here.</p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 rounded-lg px-2 text-xs">
            <Link to="/patient/messages"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />Message pharmacy</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 rounded-lg px-2 text-xs">
            <Link to="/patient/prescriptions"><FileText className="mr-1.5 h-3.5 w-3.5" />Prescriptions</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentOrders({ orders, isLoading, isError, onRetry }) {
  return (
    <Card className="rounded-xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <CardTitle className="text-base">Recent orders</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">A quick look at your latest medicine orders</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-lg">
          <Link to="/patient/orders">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {isError ? <QueryError label="Orders" onRetry={onRetry} /> : isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14 rounded-lg" />)}</div>
        ) : orders.length ? (
          <div className="divide-y divide-border/60">
            {[...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4).map((order) => {
              const needsAction = actionStatuses.has(order.status)
              return (
                <Link key={order.id} to={`/orders/${order.id}`} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${needsAction ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'}`}>
                    <PackageCheck className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{order.public_reference || 'Medicine order'}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                  </span>
                  <Badge variant={needsAction ? 'default' : 'secondary'} className="max-w-[45%] truncate text-[10px] sm:text-xs">
                    {orderStatusLabels[order.status] || order.status?.replaceAll('_', ' ')}
                  </Badge>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-7 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground"><ShoppingBag className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-semibold">No orders yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Browse medicines to place your first order.</p>
            <Button asChild variant="outline" size="sm" className="mt-4 rounded-lg"><Link to="/medicines"><Pill className="mr-2 h-3.5 w-3.5" />Browse medicines</Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentPrescriptions({ prescriptions, isLoading, isError, onRetry }) {
  return (
    <Card className="rounded-xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <CardTitle className="text-base">Prescriptions</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Recent uploads and review status</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-lg">
          <Link to="/patient/prescriptions">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {isError ? <QueryError label="Prescriptions" onRetry={onRetry} /> : isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14 rounded-lg" />)}</div>
        ) : prescriptions.length ? (
          <div className="divide-y divide-border/60">
            {[...prescriptions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4).map((prescription) => (
              <div key={prescription.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <FileText className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">Prescription #{prescription.prescriptionId}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{formatDate(prescription.createdAt)}</span>
                </span>
                <Badge variant="secondary" className="max-w-[42%] truncate text-[10px] sm:text-xs">
                  {prescription.status?.replaceAll('_', ' ') || 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-7 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground"><FileText className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-semibold">No prescriptions yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Upload a prescription for the pharmacy team to review.</p>
            <Button asChild variant="outline" size="sm" className="mt-4 rounded-lg"><Link to="/patient/prescriptions"><ClipboardList className="mr-2 h-3.5 w-3.5" />Upload prescription</Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function PatientDashboardPage() {
  const user = usePatientAuthStore((state) => state.user)
  const ordersQuery = useQuery({
    queryKey: ['patient-orders'],
    queryFn: () => api.get('/orders/my').then((response) => response.data.data),
  })
  const prescriptionsQuery = useQuery({
    queryKey: ['patient-prescriptions'],
    queryFn: () => api.get('/prescriptions/my').then((response) => response.data.data || []),
  })
  const orders = Array.isArray(ordersQuery.data) ? ordersQuery.data : []
  const prescriptions = Array.isArray(prescriptionsQuery.data) ? prescriptionsQuery.data : []
  const actionCount = orders.filter((order) => actionStatuses.has(order.status)).length
  const activeCount = orders.filter((order) => !closedStatuses.has(order.status)).length
  const completedCount = orders.filter((order) => order.status === 'COMPLETED').length
  const firstName = user?.firstName?.trim() || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <PatientPageShell className="max-w-none px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
      <div className="space-y-5 sm:space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className={`inline-flex items-center gap-1.5 text-xs font-medium ${actionCount ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {actionCount ? <ClipboardList className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
              {actionCount ? `${actionCount} item${actionCount === 1 ? '' : 's'} ${actionCount === 1 ? 'needs' : 'need'} your attention` : 'Your care is up to date'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{greeting}, {firstName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Here’s your health and pharmacy activity at a glance.</p>
          </div>
          <Button asChild className="h-10 rounded-lg">
            <Link to="/medicines"><Pill className="mr-2 h-4 w-4" />Browse medicines</Link>
          </Button>
        </header>

        <section aria-label="Care summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ordersQuery.isLoading || prescriptionsQuery.isLoading ? (
            [0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-[126px] rounded-xl" />)
          ) : (
            <>
              <SummaryCard icon={ShoppingBag} label="Active orders" value={ordersQuery.isError ? '—' : activeCount} detail={ordersQuery.isError ? 'Unable to load order count' : activeCount ? 'Orders moving through the pharmacy' : 'No active orders right now'} tone="blue" />
              <SummaryCard icon={FileText} label="Prescriptions" value={prescriptionsQuery.isError ? '—' : prescriptions.length} detail={prescriptionsQuery.isError ? 'Unable to load prescriptions' : 'On your patient account'} tone="green" />
              <SummaryCard icon={ClipboardList} label="Needs your attention" value={ordersQuery.isError ? '—' : actionCount} detail={ordersQuery.isError ? 'Unable to load action items' : actionCount ? 'A next step is waiting for you' : 'You are all caught up'} tone={actionCount ? 'amber' : 'green'} />
              <SummaryCard icon={HeartPulse} label="Completed orders" value={ordersQuery.isError ? '—' : completedCount} detail="Successfully fulfilled" tone="violet" />
            </>
          )}
        </section>

        <section aria-label="Care activity and next steps" className="grid gap-4 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <OrderActivityChart orders={orders} isLoading={ordersQuery.isLoading} isError={ordersQuery.isError} onRetry={() => ordersQuery.refetch()} />
          </div>
          <CareFocus orders={orders} isLoading={ordersQuery.isLoading} isError={ordersQuery.isError} onRetry={() => ordersQuery.refetch()} />
        </section>

        {actionCount > 0 && !ordersQuery.isError && (
          <Link to="/patient/orders" className="group flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 transition-colors duration-200 hover:bg-amber-500/10 sm:gap-4 sm:p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300"><ClipboardList className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{actionCount === 1 ? 'One order needs your attention' : `${actionCount} orders need your attention`}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Review the latest update from your pharmacy team.</span>
            </span>
            {actionCount > 1 && <span className="hidden text-xs font-medium text-amber-800 dark:text-amber-300 sm:block">{actionCount} pending</span>}
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        )}

        <section aria-label="Recent updates" className="grid min-w-0 gap-4 xl:grid-cols-2">
          <RecentOrders orders={orders} isLoading={ordersQuery.isLoading} isError={ordersQuery.isError} onRetry={() => ordersQuery.refetch()} />
          <RecentPrescriptions prescriptions={prescriptions} isLoading={prescriptionsQuery.isLoading} isError={prescriptionsQuery.isError} onRetry={() => prescriptionsQuery.refetch()} />
        </section>
      </div>
    </PatientPageShell>
  )
}
