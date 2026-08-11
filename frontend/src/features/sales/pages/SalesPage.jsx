import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, TrendingUp, ReceiptText, Banknote, Activity, ShoppingCart, Plus, Ban, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import PosDialog from '@/features/sales/components/PosDialog'
import SaleReceiptDialog from '@/features/sales/components/SaleReceiptDialog'

function money(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`
}

function colorForPayment(paymentMethod) {
  const colors = {
    CASH: 'green',
    CARD: 'blue',
    MOBILE_MONEY: 'yellow',
    INSURANCE: 'purple',
    OTHER: 'default',
  }
  return colors[paymentMethod] || 'default'
}

function colorForStatus(status) {
  const colors = {
    COMPLETED: 'green',
    REFUNDED: 'red',
    VOIDED: 'default',
  }
  return colors[status] || 'default'
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function CompactStat({ icon: Icon, label, value, variant = 'primary' }) {
  const colors = {
    primary: 'text-primary bg-primary/10',
    success: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40',
    danger: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40',
    info: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40',
  }
  return (
    <div className="rounded-lg border border-border/40 bg-card p-3 space-y-1.5 hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {label}
        </span>
        <div className={cn('p-1.5 rounded-md', colors[variant])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <span className="text-xl font-bold tabular-nums text-foreground">{value ?? '-'}</span>
    </div>
  )
}

export default function SalesPage() {
  const queryClient = useQueryClient()
  const [posOpen, setPosOpen] = useState(false)
  const [receiptSale, setReceiptSale] = useState(null)

  const summaryQuery = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => api.get('/sales/summary').then((res) => res.data),
  })

  const salesQuery = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => api.get('/sales?limit=20').then((res) => res.data),
  })

  const transitionMutation = useMutation({
    mutationFn: ({ id, action, reason }) =>
      api.post(`/sales/${id}/${action}`, { reason }).then((res) => res.data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sales-list'] })
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      toast.success(res.message || 'Sale updated')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Action failed')
    },
  })

  const summary = summaryQuery.data?.data || {}
  const totals = summary.totals || {}
  const sales = salesQuery.data?.data || []

  const handleVoid = (sale) => {
    if (window.confirm(`Void sale ${sale.referenceNumber}? Stock will be restored.`)) {
      transitionMutation.mutate({ id: sale.id, action: 'void', reason: 'Voided by staff' })
    }
  }

  const handleRefund = (sale) => {
    if (window.confirm(`Refund sale ${sale.referenceNumber}? Stock will be restored.`)) {
      transitionMutation.mutate({ id: sale.id, action: 'refund', reason: 'Refunded by staff' })
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground mt-1">Complete POS transactions, track revenue, and manage refunds.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              summaryQuery.refetch()
              salesQuery.refetch()
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setPosOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Sale
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CompactStat icon={ReceiptText} label="Total Sales" value={totals.totalSales} variant="primary" />
        <CompactStat icon={Banknote} label="Revenue" value={Math.round(totals.totalRevenue || 0)} variant="success" />
        <CompactStat icon={TrendingUp} label="Average Ticket" value={Math.round(totals.averageTransactionValue || 0)} variant="info" />
        <CompactStat icon={Activity} label="Today" value={totals.todaySales} variant="warning" />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Sales</CardTitle>
            <span className="text-xs text-muted-foreground">{sales.length} records</span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesQuery.isLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      No sales have been recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">{sale.referenceNumber || sale.reference_number || sale.id?.slice(-8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{sale.customerName || sale.customer_name || 'Walk-in customer'}</p>
                          <p className="text-xs text-muted-foreground">{sale.customerPhone || sale.customer_phone || 'No phone'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge color={colorForPayment(sale.paymentMethod || sale.payment_method)}>
                          {(sale.paymentMethod || sale.payment_method || 'OTHER').replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{money(sale.grandTotal || sale.grand_total)}</TableCell>
                      <TableCell>
                        <Badge color={colorForStatus(sale.status)}>{(sale.status || '').replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(sale.createdAt || sale.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" title="View receipt" onClick={() => setReceiptSale(sale)}>
                            <ReceiptText className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Void"
                            disabled={sale.status !== 'COMPLETED' || transitionMutation.isPending}
                            onClick={() => handleVoid(sale)}
                          >
                            <Ban className="w-4 h-4 text-destructive" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Refund"
                            disabled={sale.status !== 'COMPLETED' || transitionMutation.isPending}
                            onClick={() => handleRefund(sale)}
                          >
                            {transitionMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(summary.paymentBreakdown || []).map((entry) => (
                <div key={entry.paymentMethod} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{(entry.paymentMethod || '').replace('_', ' ')}</span>
                    <span className="text-muted-foreground">{entry.count} sales</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(8, (entry.count / Math.max(totals.totalSales || 1, 1)) * 100))}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{money(entry.revenue)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Medicines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(summary.topMedicines || []).map((item) => (
                <div key={item.medicineId || item.medicine_id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.medicineName || item.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">{item.totalQuantitySold || item.total_quantity_sold} sold</p>
                    </div>
                    <ShoppingCart className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.totalTransactions || item.total_transactions} transactions</span>
                    <span>{money(item.totalRevenue || item.total_revenue)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <PosDialog open={posOpen} onOpenChange={setPosOpen} />
      <SaleReceiptDialog saleId={receiptSale?.id} open={Boolean(receiptSale)} onOpenChange={(open) => { if (!open) setReceiptSale(null) }} />
    </motion.div>
  )
}
