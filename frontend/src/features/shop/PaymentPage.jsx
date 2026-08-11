import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Banknote, Check, CreditCard, LockKeyhole, Smartphone } from 'lucide-react'
import api from '@/lib/api'
import PublicNavbar from '@/components/shared/PublicNavbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const options = [
  { id: 'PAY_ON_PICKUP', title: 'Pay at the pharmacy', description: 'Reserve your order now and pay when collecting it.', icon: Banknote, enabled: true },
  { id: 'MOBILE_MONEY', title: 'Mobile money', description: 'Provider setup is required before this option can accept payment.', icon: Smartphone, enabled: false },
  { id: 'CARD', title: 'Debit or credit card', description: 'Secure card processing has not been configured yet.', icon: CreditCard, enabled: false },
]

export default function PaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [method, setMethod] = useState('PAY_ON_PICKUP')
  const orderQuery = useQuery({ queryKey: ['payment-order', id], queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data) })
  const payment = useMutation({
    mutationFn: () => api.post(`/orders/${id}/payment`, { method }, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
    onSuccess: (response) => {
      if (response.data.data.status === 'NOT_PROCESSED') return toast.error(response.data.data.message)
      toast.success('Pay-on-pickup confirmed')
      navigate(`/orders/${id}`)
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Payment option could not be saved'),
  })
  if (orderQuery.isLoading) return <div className="min-h-screen bg-background"><PublicNavbar /><main className="mx-auto max-w-5xl px-4 pt-28"><Skeleton className="h-[520px] rounded-3xl" /></main></div>
  if (orderQuery.isError) return <div className="min-h-screen bg-background"><PublicNavbar /><main className="mx-auto max-w-3xl px-4 pt-28"><Card><CardContent className="p-12 text-center">This payment page is unavailable.</CardContent></Card></main></div>
  const order = orderQuery.data
  const pickupEligible = order.fulfilment_method === 'PICKUP'
  return <div className="min-h-screen bg-muted/20"><PublicNavbar /><main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
    <Link to={`/orders/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to order</Link>
    <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_380px]"><section><div className="mb-7"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Secure checkout</span><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Choose how to pay</h1><p className="mt-3 max-w-xl text-muted-foreground">No card or mobile-money details are collected until an approved payment provider is connected.</p></div>
      <div className="space-y-3">{options.map((option) => { const available = option.enabled && (option.id !== 'PAY_ON_PICKUP' || pickupEligible); return <button key={option.id} disabled={!available} onClick={() => setMethod(option.id)} className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all ${method === option.id && available ? 'border-primary bg-primary/[0.04] shadow-[0_0_0_1px_hsl(var(--primary))]' : 'bg-card hover:border-foreground/20'} disabled:cursor-not-allowed disabled:opacity-50`}><span className={`rounded-xl p-3 ${method === option.id && available ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><option.icon className="h-5 w-5" /></span><span className="flex-1"><span className="flex items-center justify-between gap-3"><b>{option.title}</b>{method === option.id && available && <Check className="h-5 w-5 text-primary" />}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.id === 'PAY_ON_PICKUP' && !pickupEligible ? 'Available only when pickup is selected.' : option.description}</span></span></button>})}</div>
      <div className="mt-5 flex gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p>Urumuri does not store raw payment credentials. Pay-on-pickup records an amount due; it does not mark the order as paid.</p></div></section>
      <aside><Card className="sticky top-24 overflow-hidden rounded-3xl border-border/70 shadow-sm"><div className="border-b bg-muted/40 px-6 py-5"><p className="text-sm text-muted-foreground">Order reference</p><p className="mt-1 font-semibold">{order.public_reference}</p></div><CardContent className="p-6"><div className="space-y-4">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><div><p className="font-medium">{item.medicine_snapshot.name}</p><p className="text-muted-foreground">Qty {item.approved_quantity || item.requested_quantity} · {item.selling_unit}</p></div><span>RWF {Number(item.total).toLocaleString()}</span></div>)}</div><dl className="mt-6 space-y-3 border-t pt-5 text-sm"><div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd>RWF {Number(order.subtotal).toLocaleString()}</dd></div><div className="flex justify-between text-muted-foreground"><dt>Delivery</dt><dd>RWF {Number(order.delivery_fee).toLocaleString()}</dd></div><div className="flex justify-between border-t pt-4 text-lg font-bold"><dt>Amount due</dt><dd>RWF {Number(order.total).toLocaleString()}</dd></div></dl><Button className="mt-6 h-12 w-full rounded-xl" disabled={!pickupEligible || payment.isPending} onClick={() => payment.mutate()}>{payment.isPending ? 'Saving option…' : 'Confirm pay on pickup'}</Button><p className="mt-3 text-center text-xs text-muted-foreground">Payment will be collected at the pharmacy.</p></CardContent></Card></aside>
    </div></main></div>
}
