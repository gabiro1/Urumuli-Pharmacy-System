import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Loader2, Package, CalendarClock } from 'lucide-react'
import api from '@/lib/api'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const EMPTY = {
  medicineId: '',
  batchNumber: '',
  supplierId: '',
  quantity: '100',
  costPerUnit: '0',
  expiryDate: '',
}

function daysUntil(expiryDate) {
  if (!expiryDate) return null
  const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000)
  return days
}

function expiryBadge(batch) {
  const days = daysUntil(batch.expiryDate)
  if (batch.isExpired || (days !== null && days < 0)) return <Badge color="red">Expired</Badge>
  if (days !== null && days <= 90) return <Badge color="yellow">Expires in {days}d</Badge>
  if (days !== null) return <Badge color="green">Valid</Badge>
  return <Badge color="default">No expiry</Badge>
}

export default function BatchesTab() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })

  const batchesQuery = useQuery({
    queryKey: ['inventory-batches', status],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (status !== 'ALL') params.set('status', status)
      return api.get(`/inventory/batches?${params.toString()}`).then((res) => res.data)
    },
  })
  const batches = batchesQuery.data?.data || []

  const medicinesQuery = useQuery({
    queryKey: ['inventory-medicines-all'],
    queryFn: () => api.get('/inventory/medicines?limit=200').then((res) => res.data),
    enabled: createOpen,
  })
  const medicines = medicinesQuery.data?.data || []

  const suppliersQuery = useQuery({
    queryKey: ['inventory-suppliers'],
    queryFn: () => api.get('/inventory/suppliers?limit=100').then((res) => res.data),
    enabled: createOpen,
  })
  const suppliers = suppliersQuery.data?.data || []

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/inventory/batches', {
        medicineId: form.medicineId,
        batchNumber: form.batchNumber.trim(),
        supplierId: form.supplierId || null,
        quantity: Number(form.quantity),
        costPerUnit: Number(form.costPerUnit || 0),
        expiryDate: form.expiryDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      setCreateOpen(false)
      setForm({ ...EMPTY })
      toast.success('Batch received and stock added')
    },
    onError: (error) => toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to create batch'),
  })

  const canSubmit = form.medicineId && form.batchNumber.trim() && Number(form.quantity) > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Stock Batches</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All batches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All batches</SelectItem>
              <SelectItem value="VALID">Valid</SelectItem>
              <SelectItem value="EXPIRING">Expiring soon</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Receive Batch
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Batch No.</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Supplier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batchesQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No batches yet. Receive a batch to add stock with expiry tracking.</p>
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id} className={cn(batch.isExpired && 'bg-red-50/50 dark:bg-red-950/20')}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{batch.medicineName}</p>
                      <p className="text-xs text-muted-foreground">{batch.genericName}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{batch.batchNumber}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{batch.remainingQuantity} <span className="text-xs text-muted-foreground">/ {batch.quantity}</span></p>
                      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${batch.quantity ? Math.max(3, (batch.remainingQuantity / batch.quantity) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(batch.unitCost)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {expiryBadge(batch)}
                      {batch.expiryDate && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarClock className="w-3 h-3" />{formatDate(batch.expiryDate)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{batch.supplierName || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receive Stock Batch</DialogTitle>
            <DialogDescription>Adds quantity to the medicine's stock and records an inbound movement.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Medicine *</label>
              <Select value={form.medicineId} onValueChange={(value) => setForm((p) => ({ ...p, medicineId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                <SelectContent>
                  {medicines.map((medicine) => (
                    <SelectItem key={medicine.id} value={medicine.id}>{medicine.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch number *</label>
              <Input value={form.batchNumber} onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))} placeholder="BATCH-2026-001" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Select value={form.supplierId} onValueChange={(value) => setForm((p) => ({ ...p, supplierId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit cost (RWF)</label>
              <Input type="number" min="0" value={form.costPerUnit} onChange={(e) => setForm((p) => ({ ...p, costPerUnit: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expiry date</label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Receive Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
