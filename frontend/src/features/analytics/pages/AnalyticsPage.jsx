import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  RefreshCw,
  LineChart as LineChartIcon,
  BarChart3,
  Activity,
  FlaskConical,
  AlertTriangle,
  Wallet,
  TrendingUp,
  Boxes,
  ShoppingBag,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
} from 'recharts'
import api from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function money(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`
}

function healthColor(status) {
  const colors = {
    UP: 'green',
    DOWN: 'red',
    DEGRADED: 'yellow',
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

export default function AnalyticsPage() {
  const overviewQuery = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/analytics/overview?days=30').then((res) => res.data),
  })

  const overview = overviewQuery.data?.data || {}
  const sales = overview.sales || {}
  const inventory = overview.inventory || {}
  const prescriptions = overview.prescriptions || {}
  const profit = overview.profit || {}
  const demandForecast = overview.demandForecast || {}
  const dailyRevenue = sales.dailyRevenue || []
  const topMedicines = sales.topMedicines || []
  const systemHealth = overview.systemHealth || []
  const forecastItems = demandForecast.items || []

  const profitDaily = (profit.daily || []).map((entry) => ({
    ...entry,
    profit: Number(entry.profit || 0),
  }))

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Operational reporting across sales, inventory, prescriptions, and system health.</p>
        </div>
        <Button variant="outline" onClick={() => overviewQuery.refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CompactStat icon={BarChart3} label="Revenue" value={Math.round(sales.totals?.totalRevenue || 0)} variant="success" />
        <CompactStat icon={Wallet} label="Gross Profit" value={Math.round(profit.grossProfit || 0)} variant="primary" />
        <CompactStat icon={Activity} label="Transactions" value={sales.totals?.totalSales} variant="info" />
        <CompactStat icon={FlaskConical} label="Prescriptions" value={prescriptions.total} variant="warning" />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LineChartIcon className="w-4 h-4 text-muted-foreground" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {overviewQuery.isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : dailyRevenue.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No revenue data for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenue} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(value) => value?.slice?.(5) || value} />
                  <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <RechartsTooltip formatter={(value) => money(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="salesCount" name="Sales" stroke="hsl(var(--chart-2, 142 76% 36%))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              Profit at a glance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overviewQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Gross profit (30d)
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {money(profit.grossProfit)}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Margin <span className="font-bold">{Number(profit.margin || 0).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Revenue</p>
                    <p className="mt-1 text-base font-bold tabular-nums">{money(profit.revenue)}</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cost of goods</p>
                    <p className="mt-1 text-base font-bold tabular-nums">{money(profit.costOfGoods)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Profit Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {overviewQuery.isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : profitDaily.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No profit data for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profitDaily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(value) => value?.slice?.(5) || value} />
                  <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <RechartsTooltip formatter={(value) => money(value)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-2, 142 76% 36%))" radius={[4, 4, 0, 0]} opacity={0.35} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="w-4 h-4 text-muted-foreground" />
              Demand Forecast
              <Badge variant="secondary" className="ml-auto text-[10px]">
                next {Number(demandForecast.horizonDays || 14)} days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : forecastItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No demand forecast available yet.</p>
            ) : (
              <div className="space-y-2.5">
                {forecastItems.map((item) => (
                  <div key={item.medicineId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.medicineName}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock {item.currentStock} · Reorder at {item.reorderPoint}
                        </p>
                      </div>
                      <Badge color={item.needsRestock ? 'red' : 'green'}>
                        {item.needsRestock ? 'Restock' : 'Healthy'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            Projected {item.forecastQty} units
                          </span>
                          <span>{item.avgDailyQty}/day</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${Math.min(100, Math.round((item.forecastQty / Math.max(item.forecastQty, 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Top Medicines
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {overviewQuery.isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : topMedicines.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sales history yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMedicines.slice(0, 8)} layout="vertical" margin={{ top: 8, right: 24, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="medicineName" type="category" width={120} tick={{ fontSize: 12 }} />
                  <RechartsTooltip formatter={(value) => money(value)} />
                  <Legend />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemHealth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No system health records available.</p>
            ) : (
              systemHealth.map((entry) => (
                <div key={entry.service_name || entry.serviceName} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{entry.service_name || entry.serviceName}</p>
                    <Badge color={healthColor(entry.status)}>{entry.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Latency: {entry.latency_ms ?? 'n/a'} ms</span>
                    <span>{formatDate(entry.checked_at || entry.checkedAt)}</span>
                  </div>
                  {entry.error_message && (
                    <div className="flex items-start gap-2 text-xs text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{entry.error_message}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low Stock Medicines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(inventory.lowStockMedicines || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No low stock alerts.</p>
            ) : (
              (inventory.lowStockMedicines || []).map((medicine) => (
                <div key={medicine.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{medicine.name}</p>
                      <p className="text-xs text-muted-foreground">{medicine.categoryName || medicine.category_name || 'Uncategorized'}</p>
                    </div>
                    <Badge color="red">{medicine.currentStock ?? medicine.current_stock ?? 0}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Reorder point: {medicine.reorderPoint ?? medicine.reorder_point ?? 0}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expiring Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(inventory.expiringBatches || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No batches expiring soon.</p>
            ) : (
              (inventory.expiringBatches || []).map((batch) => (
                <div key={batch.id || batch.batchId} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{batch.medicineName}</p>
                      <p className="text-xs text-muted-foreground">Batch {batch.batchNumber}</p>
                    </div>
                    <Badge color="yellow">{batch.remainingQuantity ?? batch.remaining_quantity}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Expires {formatDate(batch.expiryDate || batch.expiry_date)}</span>
                    <span>{batch.supplierName || batch.supplier_name || 'No supplier'}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
