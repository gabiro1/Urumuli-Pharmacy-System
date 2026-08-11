import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertCircle, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const statuses = ['', 'SUBMITTED_FOR_REVIEW', 'UNDER_PHARMACIST_REVIEW', 'CLARIFICATION_REQUIRED', 'APPROVED_AWAITING_PATIENT_CONFIRMATION', 'APPROVED_AWAITING_PAYMENT', 'PAYMENT_DEFERRED', 'PAYMENT_RECEIVED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'REJECTED_BY_PHARMACIST', 'CANCELLED']

export default function OrderQueuePage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const q = useQuery({
    queryKey: ['order-queue', status, search],
    queryFn: () => api.get('/orders/queue', { params: { status: status || undefined, search: search || undefined } }).then((r) => r.data.data),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 15000,
  })

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold">Medicine requests</h1><p className="mt-1 text-muted-foreground">Review, clarify, approve and fulfil patient orders.</p></div>
      <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} />Refresh</Button>
    </div>
    <Card><CardContent className="flex flex-col gap-3 p-4 lg:flex-row"><Input placeholder="Reference, patient or phone" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item ? item.replaceAll('_', ' ') : 'All queues'}</option>)}</select></CardContent></Card>
    {q.isLoading ? <Skeleton className="h-72" /> : q.isError ? <Card className="border-destructive/30"><CardContent className="flex flex-col items-center p-12 text-center"><AlertCircle className="h-9 w-9 text-destructive" /><p className="mt-3 font-semibold">Medicine requests could not be loaded</p><p className="mt-1 text-sm text-muted-foreground">{q.error?.response?.data?.error || 'Check your staff session and try again.'}</p><Button className="mt-5" variant="outline" onClick={() => q.refetch()}>Try again</Button></CardContent></Card> : <div className="space-y-3">
      {q.data?.length ? q.data.map((order) => <Link key={order.id} to={`/app/orders/${order.id}`} className="block rounded-xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{order.public_reference}</p><p className="mt-1 text-sm text-muted-foreground">{order.patient_name || 'Verified patient'} · {order.patient_phone} · {order.item_count} item(s)</p></div><Badge>{order.status.replaceAll('_', ' ')}</Badge></div></Link>) : <Card><CardContent className="p-12 text-center text-muted-foreground">No requests match this queue.</CardContent></Card>}
    </div>}
  </div>
}
