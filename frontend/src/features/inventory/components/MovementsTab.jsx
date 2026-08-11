import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownCircle, ArrowUpCircle, RotateCcw, Timer, PackageX, Undo2, Activity, SlidersHorizontal } from 'lucide-react'
import api from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AdjustDialog } from './StockAdjustDialog'

const TYPE_META = {
  INBOUND: { icon: ArrowDownCircle, color: 'green', label: 'Inbound' },
  OUTBOUND: { icon: ArrowUpCircle, color: 'blue', label: 'Outbound' },
  ADJUSTMENT: { icon: SlidersHorizontal, color: 'yellow', label: 'Adjustment' },
  EXPIRED: { icon: Timer, color: 'red', label: 'Expired' },
  DAMAGED: { icon: PackageX, color: 'red', label: 'Damaged' },
  RETURN: { icon: Undo2, color: 'purple', label: 'Return' },
}

export default function MovementsTab() {
  const [type, setType] = useState('ALL')
  const [adjustOpen, setAdjustOpen] = useState(false)

  const movementsQuery = useQuery({
    queryKey: ['inventory-movements', type],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (type !== 'ALL') params.set('type', type)
      return api.get(`/inventory/stock-movements?${params.toString()}`).then((res) => res.data)
    },
  })
  const movements = movementsQuery.data?.data || []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Stock Movements</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All movements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All movements</SelectItem>
              <SelectItem value="INBOUND">Inbound</SelectItem>
              <SelectItem value="OUTBOUND">Outbound</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
              <SelectItem value="RETURN">Returns</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="DAMAGED">Damaged</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setAdjustOpen(true)}>
            <Activity className="w-4 h-4 mr-2" />
            Adjust Stock
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Medicine</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Stock change</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movementsQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No stock movements recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => {
                const meta = TYPE_META[movement.movementType] || { icon: Activity, color: 'default', label: movement.movementType }
                const Icon = meta.icon
                return (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <Badge color={meta.color} className="gap-1">
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{movement.medicineName}</p>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      <span className={cn(movement.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {movement.previousStock} → {movement.newStock}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {movement.referenceType || '—'}
                        {movement.stockBatchId ? ' · batch' : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {movement.notes || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{movement.performedByName || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(movement.createdAt)}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} />
    </Card>
  )
}
