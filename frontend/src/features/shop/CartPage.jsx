import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const formatMoney = (amount) => `RWF ${Number(amount).toLocaleString()}`

export default function CartPage() {
  const navigate = useNavigate()
  const { items, updateQuantity, removeItem } = useCartStore()
  const subtotal = items.reduce((sum, item) => sum + Number(item.medicine.price) * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <main className="relative overflow-hidden pb-20 pt-24 sm:pt-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_65%)]" />
        <div className="content-shell">
          <Link to="/medicines" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            <ChevronLeft className="h-4 w-4" /> Continue shopping
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <ShoppingBag className="h-3.5 w-3.5" /> Your cart
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Review your medicine request</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">Confirm your medicines and quantities before moving to our protected checkout.</p>
            </div>
            {items.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm">
                <span className="font-semibold">{itemCount}</span>{' '}
                <span className="text-muted-foreground">{itemCount === 1 ? 'item' : 'items'} selected</span>
              </div>
            )}
          </div>

          {!items.length ? (
            <Card className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-3xl border-border/70 shadow-[0_20px_60px_-45px_rgb(0,0,0,0.5)]">
              <CardContent className="flex flex-col items-center p-10 text-center sm:p-14">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h2 className="mt-6 text-2xl font-bold">Your cart is empty</h2>
                <p className="mt-2 max-w-md text-muted-foreground">Explore our medicine catalogue to add available items to your request.</p>
                <Button asChild size="lg" className="mt-7 gap-2 rounded-xl px-7">
                  <Link to="/medicines">Browse medicines <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-9 grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <section aria-label="Cart items">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Medicine items</h2>
                  <span className="text-sm text-muted-foreground">Prices shown in RWF</span>
                </div>
                <div className="space-y-4">
                  {items.map(({ medicine, quantity }) => {
                    const lineTotal = Number(medicine.price) * quantity
                    const details = [medicine.strength, medicine.dosageForm, medicine.packSize || medicine.sellingUnit].filter(Boolean).join(' · ')

                    return (
                      <Card key={medicine.id} className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
                        <CardContent className="p-0">
                          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                              <Package className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link to={`/medicines/${medicine.id}`} className="text-base font-semibold transition-colors hover:text-primary">
                                {medicine.name}
                              </Link>
                              {details && <p className="mt-1 text-sm text-muted-foreground">{details}</p>}
                              <p className="mt-3 text-sm font-medium">{formatMoney(medicine.price)} <span className="font-normal text-muted-foreground">per {medicine.sellingUnit || 'unit'}</span></p>
                            </div>
                            <div className="flex items-center justify-between gap-5 sm:block sm:text-right">
                              <p className="text-lg font-bold">{formatMoney(lineTotal)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Item total</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/30 px-5 py-3.5 sm:px-6">
                            <div className="inline-flex items-center rounded-xl border border-border bg-background p-1 shadow-sm">
                              <button aria-label={`Decrease ${medicine.name} quantity`} onClick={() => updateQuantity(medicine.id, quantity - 1)} className="grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-muted">
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                              <button aria-label={`Increase ${medicine.name} quantity`} onClick={() => updateQuantity(medicine.id, quantity + 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90">
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <button aria-label={`Remove ${medicine.name}`} onClick={() => removeItem(medicine.id)} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" /> Remove
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>

              <aside className="space-y-4 lg:sticky lg:top-24">
                <Card className="overflow-hidden rounded-3xl border-primary/20 shadow-[0_22px_60px_-42px_hsl(var(--primary)/0.5)]">
                  <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-5 text-primary-foreground">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/75">Order summary</p>
                    <h2 className="mt-1 text-xl font-bold">Ready when you are</h2>
                  </div>
                  <CardContent className="p-6">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between text-muted-foreground"><span>Items subtotal</span><span className="font-medium text-foreground">{formatMoney(subtotal)}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>Calculated at checkout</span></div>
                    </div>
                    <div className="mt-5 flex items-end justify-between border-t border-border pt-5">
                      <div><p className="text-sm font-semibold">Total before delivery</p><p className="mt-1 text-xs text-muted-foreground">No payment is taken yet</p></div>
                      <p className="text-xl font-bold text-primary">{formatMoney(subtotal)}</p>
                    </div>
                    <Button className="mt-6 h-12 w-full gap-2 rounded-xl text-base" onClick={() => navigate('/checkout')}>
                      Continue to checkout <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/70 bg-muted/30">
                  <CardContent className="flex gap-3 p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm leading-5 text-muted-foreground">Prescription medicines remain requests until a pharmacist completes a safety review and approves fulfillment.</p>
                  </CardContent>
                </Card>
                <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-green-600" /> Secure patient checkout</div>
              </aside>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
