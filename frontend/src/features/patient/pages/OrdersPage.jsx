import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Clock3, PackageCheck, ShoppingBag } from 'lucide-react'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const statusLabel = {
  AWAITING_PRESCRIPTION: 'Prescription required', SUBMITTED_FOR_REVIEW: 'Submitted for review',
  UNDER_PHARMACIST_REVIEW: 'Pharmacist reviewing', CLARIFICATION_REQUIRED: 'Information needed',
  PRESCRIBER_CLARIFICATION_REQUIRED: 'Prescriber clarification',
  APPROVED_AWAITING_PATIENT_CONFIRMATION: 'Ready for your confirmation',
  APPROVED_AWAITING_PAYMENT: 'Ready for payment', PAYMENT_PROCESSING: 'Payment processing',
  PAYMENT_RECEIVED: 'Payment received', PAYMENT_DEFERRED: 'Pay on pickup', PREPARING: 'Being prepared',
  READY_FOR_PICKUP: 'Ready for pickup', OUT_FOR_DELIVERY: 'Out for delivery', COMPLETED: 'Completed',
  REJECTED_BY_PHARMACIST: 'Not approved', CANCELLED: 'Cancelled',
}

const needsAction = status => ['APPROVED_AWAITING_PATIENT_CONFIRMATION', 'APPROVED_AWAITING_PAYMENT', 'CLARIFICATION_REQUIRED'].includes(status)

export default function OrdersPage() {
  const orders = useQuery({ queryKey: ['patient-orders'], queryFn: () => api.get('/orders/my').then(r => r.data.data), refetchInterval: 15000 })
  return <div className="mx-auto max-w-5xl space-y-6 p-6">
    <div><h1 className="text-2xl font-bold tracking-tight">My orders</h1><p className="text-sm text-muted-foreground">Review pharmacist decisions, confirm approved medicines, and follow fulfilment.</p></div>
    {orders.isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl"/>)}</div>
      : orders.isError ? <Card><CardContent className="p-10 text-center"><p className="font-medium">Orders could not be loaded.</p><Button variant="outline" className="mt-4" onClick={() => orders.refetch()}>Try again</Button></CardContent></Card>
      : !orders.data?.length ? <Card><CardContent className="flex flex-col items-center p-12 text-center"><ShoppingBag className="h-9 w-9 text-muted-foreground"/><h2 className="mt-4 font-semibold">No orders yet</h2><p className="mt-1 text-sm text-muted-foreground">Orders placed with your verified patient identity will appear here.</p><Button asChild className="mt-5"><Link to="/medicines">Browse medicines</Link></Button></CardContent></Card>
      : <div className="space-y-3">{orders.data.map(order => <Link key={order.id} to={`/orders/${order.id}`} className="group block rounded-2xl border bg-card p-5 shadow-sm transition hover:border-foreground/30 hover:shadow-md"><div className="flex items-start gap-4"><div className="rounded-xl bg-muted p-3">{order.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5"/> : needsAction(order.status) ? <PackageCheck className="h-5 w-5"/> : <Clock3 className="h-5 w-5"/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{order.public_reference}</p><Badge variant={needsAction(order.status) ? 'default' : 'secondary'}>{statusLabel[order.status] || order.status?.replaceAll('_',' ')}</Badge></div><div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground"><span>{order.item_count} medicine{Number(order.item_count) === 1 ? '' : 's'}</span><span>RWF {Number(order.total).toLocaleString()}</span><span>{new Date(order.created_at).toLocaleDateString()}</span></div>{order.status === 'APPROVED_AWAITING_PATIENT_CONFIRMATION' && <p className="mt-3 text-sm font-medium">Your pharmacist has approved this order. Open it to review the directions and confirm.</p>}</div><ChevronRight className="mt-2 h-5 w-5 text-muted-foreground transition group-hover:translate-x-1"/></div></Link>)}</div>}
  </div>
}
