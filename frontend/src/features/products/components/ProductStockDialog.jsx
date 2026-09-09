import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Minus, Plus, PackageMinus } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STOCK_REASONS } from '../productConstants'
import { cn } from '@/lib/utils'

export default function ProductStockDialog({ product, open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [direction, setDirection] = useState('add')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('OTHER')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setDirection('add')
      setQuantity('')
      setReason('OTHER')
      setNotes('')
    }
  }, [open, product?.id])

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/inventory/products/${product.id}/stock`, {
        quantity: direction === 'add' ? Number(quantity) : -Number(quantity),
        reason: STOCK_REASONS.find((r) => r.value === reason)?.label || 'Stock adjustment',
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      toast.success('Stock adjusted')
      onOpenChange(false)
    },
    onError: (error) =>
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to adjust stock'),
  })

  const qty = Number(quantity)
  const canSubmit = Number.isInteger(qty) && qty > 0 && Boolean(product)
  const currentStock = Number(product?.currentStock ?? 0)
  const projected = direction === 'add' ? currentStock + qty : currentStock - qty
  const valid = canSubmit && projected >= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="h-5 w-5 text-primary" /> Adjust Stock
          </DialogTitle>
          <DialogDescription>
            {product?.name} — record the change instead of overwriting stock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
            <span className="text-sm text-muted-foreground">Current stock</span>
            <span className="text-lg font-bold tabular-nums">{currentStock}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('add')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                direction === 'add'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              )}
            >
              <Plus className="h-4 w-4" /> Add Stock
            </button>
            <button
              type="button"
              onClick={() => setDirection('remove')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                direction === 'remove'
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'hover:bg-muted'
              )}
            >
              <Minus className="h-4 w-4" /> Remove Stock
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Quantity</Label>
            <Input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10"
            />
            {canSubmit && (
              <p className={cn('text-xs', projected >= 0 ? 'text-muted-foreground' : 'text-destructive')}>
                New stock level: {projected}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STOCK_REASONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes about this adjustment" />
          </div>

          {valid && projected < currentStock && (
            <Badge variant="outline" className="text-[10px]">Stock will decrease</Badge>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
