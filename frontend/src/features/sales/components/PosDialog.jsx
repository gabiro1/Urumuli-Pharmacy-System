import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Search, Plus, Minus, Trash2, Loader2, ShoppingCart, CheckCircle2, Banknote, ScanLine } from 'lucide-react'
import api from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE_MONEY', 'INSURANCE', 'OTHER']

export default function PosDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [amountTendered, setAmountTendered] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [notes, setNotes] = useState('')
  const [done, setDone] = useState(null)
  const [barcode, setBarcode] = useState('')
  const [scanState, setScanState] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const barcodeLookup = useQuery({
    queryKey: ['pos-barcode', barcode],
    queryFn: () => api.get(`/inventory/medicines/barcode/${encodeURIComponent(barcode)}`).then((res) => res.data),
    enabled: open && barcode.length > 0,
    retry: false,
  })

  useEffect(() => {
    if (barcodeLookup.data?.data && open) {
      const medicine = barcodeLookup.data.data
      const stock = Number(medicine.currentStock ?? medicine.current_stock ?? 0)
      if (stock <= 0) {
        setScanState({ ok: false, message: 'Out of stock' })
      } else {
        addToCart(medicine)
        setScanState({ ok: true, message: `${medicine.name} added to cart` })
      }
      setBarcode('')
    }
  }, [barcodeLookup.data, open])

  useEffect(() => {
    if (barcodeLookup.isError && open) {
      setScanState({ ok: false, message: 'No medicine found for that barcode' })
      setBarcode('')
    }
  }, [barcodeLookup.isError, open])

  useEffect(() => {
    if (!scanState || !open) return
    const timer = setTimeout(() => setScanState(null), 2500)
    return () => clearTimeout(timer)
  }, [scanState, open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      const target = e.target
      const isTyping = target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      if (isTyping) return

      if (e.key === 'Enter') {
        e.preventDefault()
        if (barcode) {
          setBarcode('')
        }
        return
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setBarcode((prev) => prev + e.key)
      } else if (e.key === 'Backspace' && barcode) {
        setBarcode((prev) => prev.slice(0, -1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, barcode])

  useEffect(() => {
    if (open) {
      setSearch('')
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setPaymentMethod('CASH')
      setAmountTendered('')
      setDiscountAmount('0')
      setNotes('')
      setDone(null)
      setBarcode('')
      setScanState(null)
    }
  }, [open])

  const medicinesQuery = useQuery({
    queryKey: ['pos-medicines', debounced],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '12' })
      if (debounced) params.set('search', debounced)
      return api.get(`/inventory/medicines?${params.toString()}`).then((res) => res.data)
    },
    enabled: open,
  })

  const medicines = (medicinesQuery.data?.data || []).filter(
    (m) => (m.currentStock ?? m.current_stock ?? 0) > 0 && m.isActive !== false
  )

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0),
    [cart]
  )
  const discount = Number(discountAmount || 0)
  const tax = 0
  const grandTotal = Math.max(0, subtotal - discount + tax)
  const tendered = Number(amountTendered || 0)
  const change = tendered - grandTotal

  function addToCart(medicine) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === medicine.id)
      if (existing) {
        return prev.map((item) =>
          item.id === medicine.id ? { ...item, qty: item.qty + 1 } : item
        )
      }
      return [
        ...prev,
        {
          id: medicine.id,
          name: medicine.name,
          strength: medicine.strength,
          price: Number(medicine.price || 0),
          sellingUnit: medicine.sellingUnit || medicine.selling_unit || 'unit',
          maxStock: Number(medicine.currentStock ?? medicine.current_stock ?? 0),
          qty: 1,
        },
      ]
    })
  }

  function setQty(id, qty) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, Math.min(item.maxStock, qty)) } : item
      )
    )
  }

  const saleMutation = useMutation({
    mutationFn: () =>
      api.post('/sales', {
        items: cart.map((item) => ({ medicineId: item.id, quantity: item.qty })),
        customer: {
          name: customerName.trim() || undefined,
          phone: customerPhone.trim() || undefined,
        },
        paymentMethod,
        amountTendered: tendered || null,
        discountAmount: discount,
        taxAmount: tax,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (res) => {
      setDone(res.data?.data || null)
      queryClient.invalidateQueries({ queryKey: ['sales-list'] })
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      toast.success('Sale completed')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to complete sale')
    },
  })

  const canSubmit = cart.length > 0 && grandTotal > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            New Sale
          </DialogTitle>
          <DialogDescription>
            Search products, add quantities, take payment, and complete the transaction.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 px-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900/40 p-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold">Sale completed</h3>
            <div className="text-center space-y-1 text-sm">
              <p className="font-mono text-muted-foreground">Reference: {done.referenceNumber}</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(done.grandTotal)}</p>
              <p className="text-muted-foreground">
                Change due: <span className="font-medium text-foreground">{formatCurrency(done.changeAmount)}</span>
              </p>
            </div>
            <DialogFooter className="sm:justify-center pt-4">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex-1 grid md:grid-cols-2 overflow-hidden">
            <div className="p-5 space-y-4 border-r border-border flex flex-col max-h-[60vh] md:max-h-none">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Scan a barcode or use the search box
                </p>
              </div>
              {scanState && (
                <div className={`rounded-md px-3 py-2 text-sm ${scanState.ok ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                  {scanState.message}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search medicines..."
                  className="pl-10"
                  autoFocus
                />
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="grid gap-2 pr-3">
                  {medicinesQuery.isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                      ))
                    : medicines.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-10">
                          {debounced ? 'No in-stock medicines match your search.' : 'No in-stock medicines available.'}
                        </p>
                      ) : (
                        medicines.map((medicine) => {
                          const inCart = cart.find((item) => item.id === medicine.id)
                          return (
                            <button
                              key={medicine.id}
                              onClick={() => addToCart(medicine)}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 text-left hover:border-primary/40 hover:bg-accent/40 transition-colors"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <p className="font-medium truncate">{medicine.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {medicine.strength ? `${medicine.strength} · ` : ''}
                                  {formatCurrency(medicine.price)} / {medicine.sellingUnit || 'unit'}
                                </p>
                              </div>
                              {inCart && (
                                <Badge color="primary" className="shrink-0">
                                  {inCart.qty} in cart
                                </Badge>
                              )}
                            </button>
                          )
                        })
                      )}
                </div>
              </ScrollArea>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Current Cart</p>
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No items yet. Select products from the left.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)} × {item.qty} = {formatCurrency(item.price * item.qty)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(item.id, item.qty - 1)}>
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums">{item.qty}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(item.id, item.qty + 1)}>
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setCart((prev) => prev.filter((x) => x.id !== item.id))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Customer name</label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in customer" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Customer phone</label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+250..." />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Payment method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Discount (RWF)</label>
                  <Input type="number" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Tendered</label>
                  <Input type="number" min="0" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="rounded-lg bg-muted/60 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(discount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">{formatCurrency(tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
                </div>
                {paymentMethod !== 'INSURANCE' && (
                  <div className={cn('flex justify-between', change >= 0 ? 'text-muted-foreground' : 'text-destructive')}>
                    <span>Change</span>
                    <span className="tabular-nums">{formatCurrency(Math.abs(change))} {change < 0 ? 'due' : ''}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Payment is recorded immediately. Void or refund completed sales from the sales list.
                </p>
              </div>
            </div>
          </div>
        )}

        {!done && (
          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => saleMutation.mutate()} disabled={!canSubmit || saleMutation.isPending}>
              {saleMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Complete Sale · {formatCurrency(grandTotal)}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
