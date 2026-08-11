import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ReceiptText, Loader2, Printer, Download, X } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function SaleReceiptDialog({ saleId, open, onOpenChange }) {
  const receiptQuery = useQuery({
    queryKey: ['sale-receipt', saleId],
    queryFn: () => api.get(`/sales/${saleId}/receipt`).then((res) => res.data),
    enabled: Boolean(saleId) && open,
  })

  const sale = receiptQuery.data?.data || null

  const fetchPrintHtml = async () => {
    if (!saleId) return null
    const url = `${import.meta.env.VITE_API_URL || '/api/v1'}/sales/${saleId}/receipt/print`
    const authToken = localStorage.getItem('accessToken')
    const response = await fetch(url, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    })
    if (!response.ok) throw new Error('Failed to load printable receipt')
    return response.text()
  }

  const handlePrint = async () => {
    try {
      const html = await fetchPrintHtml()
      if (!html) return
      const blob = new Blob([html], { type: 'text/html' })
      const objectUrl = URL.createObjectURL(blob)
      const printWindow = window.open(objectUrl, '_blank', 'width=680,height=860')
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
      if (printWindow) printWindow.focus()
    } catch {
      toast.error('Could not open printable receipt')
    }
  }

  const handleDownload = async () => {
    try {
      const html = await fetchPrintHtml()
      if (!html) return
      const blob = new Blob([html], { type: 'text/html' })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${sale?.referenceNumber || saleId}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
    } catch {
      toast.error('Could not download receipt')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between w-full gap-2">
            <span className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5" />
              Sale Receipt
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {receiptQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !sale ? (
          <p className="text-center text-muted-foreground py-12">Receipt not found.</p>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-dashed border-border p-6 font-mono text-sm space-y-4"
            >
              <div className="text-center space-y-1">
                <p className="font-bold tracking-widest uppercase text-base bg-gradient-to-r from-emerald-600 to-primary bg-clip-text text-transparent">
                  Urumuli Pharmacy
                </p>
                <p className="text-xs text-muted-foreground">Kigali, Rwanda</p>
              </div>
              <Separator className="border-dashed" />
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Receipt</span>
                  <span className="text-foreground font-medium">{sale.referenceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{formatDate(sale.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier</span>
                  <span>{sale.cashierName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span>{(sale.paymentMethod || '').replace('_', ' ')}</span>
                </div>
                {(sale.customerName || sale.customerPhone) && (
                  <div className="flex justify-between">
                    <span>Customer</span>
                    <span>
                      {[sale.customerName, sale.customerPhone].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </div>
                )}
              </div>
              <Separator className="border-dashed" />
              <div className="space-y-1.5">
                {(sale.items || []).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate">{item.medicineName || 'Item'}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <span className="tabular-nums shrink-0">{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
              <Separator className="border-dashed" />
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(sale.totalAmount)}</span>
                </div>
                {Number(sale.discountAmount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatCurrency(sale.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(sale.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tendered</span>
                  <span className="tabular-nums">
                    {sale.amountTendered != null ? formatCurrency(sale.amountTendered) : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Change</span>
                  <span className="tabular-nums">{formatCurrency(sale.changeAmount)}</span>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs uppercase tracking-wider font-semibold">
                  {sale.status}
                </span>
              </div>
              <p className="text-center text-xs text-muted-foreground">Thank you for choosing Urumuli Pharmacy!</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
