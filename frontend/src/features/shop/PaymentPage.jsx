import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Banknote, Check, CreditCard, Loader2, LockKeyhole, Smartphone } from 'lucide-react'
import api from '@/lib/api'
import PublicNavbar from '@/components/shared/PublicNavbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function PaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const idempotencyKey = useRef(crypto.randomUUID())
  const [method, setMethod] = useState('PAY_ON_PICKUP')
  const [pendingPayment, setPendingPayment] = useState(false)

  const orderQuery = useQuery({ queryKey: ['payment-order', id], queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data) })
  const providersQuery = useQuery({ queryKey: ['payment-providers'], queryFn: () => api.get('/orders/payment-providers').then((r) => r.data.data), retry: 1 })

  const paymentSummaryQuery = useQuery({
    queryKey: ['payment-summary', id],
    queryFn: () => api.get(`/orders/${id}/payment`).then((r) => r.data.data),
    enabled: pendingPayment,
    refetchInterval: pendingPayment ? 2000 : false,
  })

  const paid = paymentSummaryQuery.data?.paymentStatus === 'PAID' || paymentSummaryQuery.data?.status === 'PAYMENT_RECEIVED'

  useEffect(() => {
    if (!pendingPayment) return
    if (paid) {
      toast.success('Payment received. Your order is being prepared.')
      navigate(`/orders/${id}`)
    }
  }, [paid, pendingPayment, id, navigate])

  const payment = useMutation({
    mutationFn: () => api.post(`/orders/${id}/payment`, { method }, { headers: { 'Idempotency-Key': idempotencyKey.current } }),
    onSuccess: (response) => {
      const data = response.data.data
      if (data.status === 'NOT_PROCESSED') return toast.error(data.message)
      if (data.status === 'PAYMENT_DEFERRED') {
        toast.success('Payment at pickup confirmed')
        return navigate(`/orders/${id}`)
      }
      if (data.status === 'PAYMENT_RECEIVED') {
        toast.success('Payment received. Your order is being prepared.')
        return navigate(`/orders/${id}`)
      }
      if (data.status === 'PAYMENT_PROCESSING') {
        toast.info(data.message)
        setPendingPayment(true)
      }
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Payment option could not be saved'),
  })

  if (orderQuery.isLoading) return <div className="min-h-screen bg-background"><PublicNavbar /><main className="mx-auto max-w-5xl px-4 pt-28"><Skeleton className="h-[520px] rounded-3xl" /></main></div>
  if (orderQuery.isError) return <div className="min-h-screen bg-background"><PublicNavbar /><main className="mx-auto max-w-3xl px-4 pt-28"><Card><CardContent className="p-12 text-center">This payment page is unavailable.</CardContent></Card></main></div>

  const order = orderQuery.data
  const pickupEligible = order.fulfilment_method === 'PICKUP'
  const providers = providersQuery.data || { configured: false, methods: [] }
  const onlineEnabled = providers.configured && providers.methods.length > 0

  const options = [
    { id: 'PAY_ON_PICKUP', title: 'Pay at the pharmacy', description: 'Reserve your order now and pay when collecting it.', icon: Banknote, enabled: pickupEligible },
    { id: 'MOBILE_MONEY', title: 'Mobile money', description: onlineEnabled ? 'Pay securely with mobile money.' : 'Mobile money is not configured yet.', icon: Smartphone, enabled: onlineEnabled && providers.methods.includes('MOBILE_MONEY') },
    { id: 'CARD', title: 'Debit or credit card', description: onlineEnabled ? 'Pay securely by card.' : 'Card processing is not configured yet.', icon: CreditCard, enabled: onlineEnabled && providers.methods.includes('CARD') },
  ]
  const selected = options.find((o) => o.id === method) || options[0]
  const canSubmit = selected?.enabled && !payment.isPending && !pendingPayment

  return <div className="min-h-screen bg-muted/20"><PublicNavbar /><main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
    <Link to={`/orders/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to order</Link>
    <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_380px]"><section>
      <div className="mb-7"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Secure checkout</span><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Choose how to pay</h1><p className="mt-3 max-w-xl text-muted-foreground">{onlineEnabled ? 'Payments are processed through the connected provider. No raw card or PIN data ever touches our servers.' : 'No card or mobile-money details are collected until an approved payment provider is connected.'}</p></div>
      <div className="space-y-3">{options.map((option) => { const available = option.enabled; return <button key={option.id} disabled={!available} onClick={() => setMethod(option.id)} className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all ${method === option.id && available ? 'border-primary bg-primary/[0.04] shadow-[0_0_0_1px_hsl(var(--primary))]' : 'bg-card hover:border-foreground/20'} disabled:cursor-not-allowed disabled:opacity-50`}><span className={`rounded-xl p-3 ${method === option.id && available ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><option.icon className="h-5 w-5" /></span><span className="flex-1"><span className="flex items-center justify-between gap-3"><b>{option.title}</b>{method === option.id && available && <Check className="h-5 w-5 text-primary" />}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span></span></button> })}
      </div>
      {pendingPayment && <div className="mt-5 flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /><p>Waiting for the payment provider to confirm your payment…</p></div>}
      <div className="mt-5 flex gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p>Urumuri does not store raw payment credentials. An order is only marked as paid after the provider confirms successful payment.</p></div>
    </section>
    <aside><Card className="sticky top-24 overflow-hidden rounded-3xl border-border/70 shadow-sm"><div className="border-b bg-muted/40 px-6 py-5"><p className="text-sm text-muted-foreground">Order reference</p><p className="mt-1 font-semibold">{order.public_reference}</p></div><CardContent className="p-6">
      <div className="space-y-4">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><div><p className="font-medium">{item.medicine_snapshot.name}</p><p className="text-muted-foreground">Qty {item.approved_quantity || item.requested_quantity} · {item.selling_unit}</p></div><span>RWF {Number(item.total).toLocaleString()}</span></div>)}</div>
      <dl className="mt-6 space-y-3 border-t pt-5 text-sm"><div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd>RWF {Number(order.subtotal).toLocaleString()}</dd></div><div className="flex justify-between text-muted-foreground"><dt>Delivery</dt><dd>RWF {Number(order.delivery_fee).toLocaleString()}</dd></div><div className="flex justify-between border-t pt-4 text-lg font-bold"><dt>Amount due</dt><dd>RWF {Number(order.total).toLocaleString()}</dd></div></dl>
      <Button className="mt-6 h-12 w-full rounded-xl" disabled={!canSubmit} onClick={() => payment.mutate()}>{payment.isPending ? 'Saving option…' : pendingPayment ? 'Processing…' : selected?.id === 'PAY_ON_PICKUP' ? 'Confirm pay on pickup' : `Pay ${selected?.id === 'CARD' ? 'by card' : 'with mobile money'}`}</Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">{selected?.id === 'PAY_ON_PICKUP' ? 'Payment will be collected at the pharmacy.' : pendingPayment ? 'We will update your order once the payment is confirmed.' : 'You will be redirected to confirm the payment with your provider.'}</p>
    </CardContent></Card></aside>
    </div></main></div>
}