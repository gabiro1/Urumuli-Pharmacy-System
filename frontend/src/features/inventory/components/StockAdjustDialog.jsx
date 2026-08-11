import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, SlidersHorizontal } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const EMPTY = {
  medicineId: '',
  quantity: '',
  reason: 'ADJUSTMENT',
  notes: '',
}

export function AdjustDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ ...EMPTY })

  const medicinesQuery = useQuery({
    queryKey: ['inventory-medicines-all'],
    queryFn: () => api.get('/inventory/medicines?limit=200').then((res) => res.data),
    enabled: open,
  })
  const medicines = medicinesQuery.data?.data || []

  const adjustMutation = useMutation({
    mutationFn: () =>
      api.post('/inventory/stock-adjust', {
        medicineId: form.medicineId,
        quantity: Number(form.quantity),
        reason: form.reason,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-medicines'] })
      setForm({ ...EMPTY })
      onOpenChange(false)
      toast.success('Stock adjusted')
    },
    onError: (error) => toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to adjust stock'),
  })

  const canSubmit = form.medicineId && form.quantity !== '' && Number(form.quantity) !== 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            Adjust Stock
          </DialogTitle>
          <DialogDescription>
            Positive quantities add stock; negative quantities remove it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="e.g. +10 or -5"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Select value={form.reason} onValueChange={(value) => setForm((p) => ({ ...p, reason: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADJUSTMENT">Manual adjustment</SelectItem>
                  <SelectItem value="DAMAGED">Damaged stock</SelectItem>
                  <SelectItem value="EXPIRED">Expired stock</SelectItem>
                  <SelectItem value="RETURN">Return to supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Reason for the adjustment"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => adjustMutation.mutate()} disabled={!canSubmit || adjustMutation.isPending}>
            {adjustMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Apply Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
