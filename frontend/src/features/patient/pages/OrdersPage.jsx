import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Clock3, PackageCheck, ShoppingBag } from 'lucide-react'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PatientPageHeader, PatientPageShell } from '../components/PatientPageShell'

const statusLabel = {
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

const needsAction = (status) => [
  'APPROVED_AWAITING_PATIENT_CONFIRMATION',
  'APPROVED_AWAITING_PAYMENT',
  'CLARIFICATION_REQUIRED',
].includes(status)

function OrderIcon({ status }) {
  const Icon = status === 'COMPLETED' ? CheckCircle2 : needsAction(status) ? PackageCheck : Clock3
  const tone = status === 'COMPLETED'
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : needsAction(status)
      ? 'bg-primary/10 text-primary'
      : 'bg-muted text-muted-foreground'

  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
}

export default function OrdersPage() {
  const orders = useQuery({
    queryKey: ['patient-orders'],
    queryFn: () => api.get('/orders/my').then((response) => response.data.data),
    refetchInterval: 5000,
  })

  const orderList = orders.data || []

  return (
    <PatientPageShell className="max-w-5xl">
      <PatientPageHeader
        eyebrow="Your care"
        title="Orders"
        description="Keep track of pharmacist approvals, payments, and medicine collection in one place."
      />

      {orders.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-2xl" />)}
        </div>
      ) : orders.isError ? (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardContent className="p-10 text-center">
            <p className="font-medium">Orders could not be loaded.</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => orders.refetch()}>Try again</Button>
          </CardContent>
        </Card>
      ) : !orderList.length ? (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center p-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag className="h-7 w-7" />
            </span>
            <h2 className="mt-5 font-semibold">No orders yet</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Orders placed with your verified patient identity will appear here.
            </p>
            <Button asChild className="mt-5 h-10 rounded-xl"><Link to="/medicines">Browse medicines</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {orderList.length} {orderList.length === 1 ? 'order' : 'orders'}
          </p>
          {orderList.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="group block rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:border-foreground/25 hover:shadow-md sm:p-5"
            >
              <div className="flex items-start gap-3.5 sm:gap-4">
                <OrderIcon status={order.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold sm:text-base">{order.public_reference}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge variant={needsAction(order.status) ? 'default' : 'secondary'} className="shrink-0 text-[10px] sm:text-xs">
                      {statusLabel[order.status] || order.status?.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 sm:grid-cols-3">
                    <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Items</p><p className="mt-1 text-xs font-semibold">{order.item_count} medicine{Number(order.item_count) === 1 ? '' : 's'}</p></div>
                    <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Total</p><p className="mt-1 text-xs font-semibold">RWF {Number(order.total).toLocaleString()}</p></div>
                    <div className="col-span-2 sm:col-span-1"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Next step</p><p className="mt-1 truncate text-xs font-semibold">{order.status === 'APPROVED_AWAITING_PATIENT_CONFIRMATION' ? 'Review approval' : needsAction(order.status) ? 'Action needed' : 'Pharmacy processing'}</p></div>
                  </div>
                  {order.status === 'APPROVED_AWAITING_PATIENT_CONFIRMATION' && (
                    <p className="mt-3 text-xs font-medium text-primary">Your pharmacist approved this order. Open it to review and confirm.</p>
                  )}
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PatientPageShell>
  )
}
