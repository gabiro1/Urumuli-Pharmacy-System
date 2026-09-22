import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const AVAILABLE_STATUSES = ['PHYSICALLY_AVAILABLE', 'INVENTORY_UPDATED']

function money(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-4 py-3 sm:px-5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

export default function AvailabilityOrderPrompt({ request }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [consent, setConsent] = useState(false)

  useEffect(() => {
    setQuantity(1)
    setConsent(false)
  }, [request?.id])

  const maximumQuantity = Math.max(1, Number(request?.physicalStockConfirmed || 1))
  const unitPrice = Number(request?.quotedUnitPrice || 0)
  const quantityNumber = Number(quantity) || 1
  const orderTotal = unitPrice * quantityNumber

  const updateQuantity = (nextQuantity) => {
    const safeQuantity = Math.min(maximumQuantity, Math.max(1, Number(nextQuantity) || 1))
    setQuantity(safeQuantity)
  }

  const createOrder = useMutation({
    mutationFn: () => api.post(
      `/availability/requests/${request.id}/order`,
      { quantity: quantityNumber, fulfilmentMethod: 'PICKUP', deliveryAddress: '', consent },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } }
    ),
    onSuccess: (response) => {
      const order = response.data.data
      queryClient.invalidateQueries({ queryKey: ['availability-conversation', request.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversation', request.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['patient-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['patient-orders'] })
      setOpen(false)
      toast.success('Order created. Continue to payment.')
      navigate(`/orders/${order.id}/payment`)
    },
    onError: (error) => toast.error(
      error?.response?.data?.message || error?.response?.data?.error || 'The order could not be created'
    ),
  })

  if (!request || !AVAILABLE_STATUSES.includes(request.verificationStatus)) return null

  if (request.medicineId && request.verificationStatus === 'PHYSICALLY_AVAILABLE') {
    return (
      <div className="border-t border-border/60 bg-card px-3 py-3 md:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/20 sm:px-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <PackageCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Stock confirmed by the pharmacy</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Digital inventory needs to be synchronised before checkout can begin.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (request.orderId) {
    return (
      <div className="border-t border-border/60 bg-card px-3 py-2.5 md:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/20 sm:px-3.5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground sm:text-sm">Your medicine is reserved</p>
                <p className="mt-0.5 hidden truncate text-[11px] leading-4 text-muted-foreground sm:block">
                  Choose a payment option to complete your order.
                </p>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 gap-1.5">
              <Button asChild size="sm" className="h-8 rounded-lg px-2.5 text-[11px] sm:px-3 sm:text-xs">
                <Link to={`/orders/${request.orderId}/payment`}>
                  <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Continue to payment</span>
                  <span className="sm:hidden">Pay</span>
                  <ArrowRight className="ml-1.5 hidden h-3.5 w-3.5 sm:inline" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-[11px] sm:px-3 sm:text-xs">
                <Link to={`/orders/${request.orderId}`}>
                  <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">View order</span>
                  <span className="sm:hidden">Order</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (request.quotedUnitPrice === null || request.quotedUnitPrice === undefined) return null

  return (
    <>
      <div className="border-t border-border/60 bg-card px-3 py-3 md:px-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/70 bg-background">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_214px]">
            <div className="flex min-w-0 gap-3.5 p-4 sm:p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                    Available now
                  </span>
                  <span className="text-xs text-muted-foreground">Checked by Urumuli pharmacist</span>
                </div>
                <h3 className="mt-1.5 truncate text-base font-semibold tracking-tight sm:text-lg">
                  {request.medicineName}
                </h3>
                <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
                  Confirm the quantity you need and reserve it for pickup at the pharmacy.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3 border-t border-border/60 bg-muted/20 p-4 sm:p-5 lg:border-l lg:border-t-0">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Price per {request.sellingUnit || 'unit'}</p>
                <p className="mt-1 text-xl font-bold tracking-tight">{money(unitPrice)}</p>
              </div>
              <Button size="lg" className="h-11 w-full rounded-xl" onClick={() => setOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Order and pay
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x border-t border-border/60 sm:grid-cols-3">
            <Detail icon={PackageCheck} label="Available" value={`${maximumQuantity} ${request.sellingUnit || 'unit'}${maximumQuantity === 1 ? '' : 's'}`} />
            <Detail icon={MapPin} label="Fulfilment" value="Pharmacy pickup" />
            <div className="col-span-2 border-t sm:col-span-1 sm:border-l-0 sm:border-t-0">
              <Detail icon={ShieldCheck} label="Payment" value="Secure checkout" />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg sm:rounded-2xl">
          <div className="border-b border-border/60 px-6 py-5 pr-12">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Complete your order</DialogTitle>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    Review the quantity and reserve {request.medicineName} for pickup.
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <form
            className="space-y-4 p-6"
            onSubmit={(event) => {
              event.preventDefault()
              if (quantityNumber < 1 || quantityNumber > maximumQuantity || !consent) return
              createOrder.mutate()
            }}
          >
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{request.medicineName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{money(unitPrice)} per {request.sellingUnit || 'unit'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Estimated total</p>
                  <p className="mt-1 text-lg font-bold text-primary">{money(orderTotal)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                <div>
                  <Label htmlFor="availability-order-quantity" className="text-sm font-semibold">Quantity</Label>
                  <p className="mt-1 text-xs text-muted-foreground">{maximumQuantity} available</p>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-background p-1">
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(quantityNumber - 1)} disabled={quantityNumber <= 1} aria-label="Decrease quantity">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="availability-order-quantity"
                    className="h-8 w-10 border-0 bg-transparent p-0 text-center text-sm font-semibold shadow-none focus-visible:ring-0"
                    type="number"
                    min="1"
                    max={maximumQuantity}
                    value={quantity}
                    onChange={(event) => updateQuantity(event.target.value)}
                    aria-label="Quantity"
                  />
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(quantityNumber + 1)} disabled={quantityNumber >= maximumQuantity} aria-label="Increase quantity">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">Pickup from Urumuli pharmacy</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Payment is completed before collection or at the pharmacy.</p>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm transition-colors hover:bg-muted/30">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
              <span className="leading-5">I confirm the medicine and quantity are correct.</span>
            </label>

            <Button type="submit" className="h-11 w-full rounded-xl" disabled={createOrder.isPending || !consent || quantityNumber < 1 || quantityNumber > maximumQuantity}>
              {createOrder.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              {createOrder.isPending ? 'Creating your order...' : 'Create order and continue to payment'}
              {!createOrder.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>

            <p className="flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Securely linked to this conversation
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
