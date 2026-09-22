import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, PackageCheck, PackageX, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { AVAILABILITY_STATUS } from '@/lib/availability'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AvailabilityStatusBanner from './AvailabilityStatusBanner'

export default function AvailabilityRequestPanel({ request, conversationId }) {
  const qc = useQueryClient()
  const [confirmed, setConfirmed] = useState(request?.physicalStockConfirmed ?? '')
  const [notes, setNotes] = useState('')
  const [unitPrice, setUnitPrice] = useState(request?.quotedUnitPrice ?? request?.catalogPrice ?? '')

  useEffect(() => {
    if (request?.quotedUnitPrice !== null && request?.quotedUnitPrice !== undefined) {
      setUnitPrice(request.quotedUnitPrice)
    } else if (request?.catalogPrice !== null && request?.catalogPrice !== undefined) {
      setUnitPrice(request.catalogPrice)
    }
  }, [request?.id, request?.quotedUnitPrice, request?.catalogPrice])

  const status = request?.verificationStatus
  const resolved = status !== AVAILABILITY_STATUS.PENDING
  const canSync =
    status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE && request.medicineId && status !== AVAILABILITY_STATUS.INVENTORY_UPDATED

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['availability-conversation', conversationId] })
    qc.invalidateQueries({ queryKey: ['pharmacist-conversation', conversationId] })
    qc.invalidateQueries({ queryKey: ['pharmacist-messages', conversationId] })
    qc.invalidateQueries({ queryKey: ['pharmacist-inbox'] })
  }

  const verify = useMutation({
    mutationFn: (payload) => api.put(`/availability/requests/${request.id}/verify`, payload),
    onSuccess: () => {
      setNotes('')
      invalidate()
      toast.success('Availability recorded')
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Could not record the verification'),
  })

  const sync = useMutation({
    mutationFn: () =>
      api.put(`/availability/requests/${request.id}/inventory`, { physicalStock: Number(confirmed) }),
    onSuccess: () => {
      invalidate()
      toast.success('Digital inventory updated from the physical count')
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Could not synchronise the inventory'),
  })

  return (
    <div className="space-y-0">
      <AvailabilityStatusBanner request={request} />

      {!resolved && (
        <div className="flex flex-wrap items-end gap-3 border-b border-border/60 bg-card px-4 py-3 md:px-6">
          <div className="min-w-[180px]">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Confirmed physical stock
            </label>
            <Input
              type="number"
              min={0}
              value={confirmed}
              onChange={(e) => setConfirmed(e.target.value)}
              placeholder="Quantity on the shelf"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Price per unit (RWF)
            </label>
            <Input
              type="number"
              min={0}
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              placeholder="Price for patient"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Note for the patient (optional)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. available behind the counter"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-10 rounded-xl"
              onClick={() =>
                verify.mutate({
                  status: AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE,
                  physicalStockConfirmed: Number(confirmed),
                  unitPrice: Number(unitPrice),
                  notes: notes.trim() || undefined,
                })
              }
               disabled={verify.isPending || sync.isPending || confirmed === '' || Number(confirmed) <= 0 || unitPrice === '' || Number(unitPrice) < 0}
            >
              {verify.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
              Physically available
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() =>
                verify.mutate({
                  status: AVAILABILITY_STATUS.PHYSICALLY_UNAVAILABLE,
                  notes: notes.trim() || undefined,
                })
              }
              disabled={verify.isPending || sync.isPending}
            >
              <PackageX className="mr-2 h-4 w-4" />
              Not available
            </Button>
          </div>
        </div>
      )}

      {canSync && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-card px-4 py-3 md:px-6">
          <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Update the digital inventory to match the confirmed physical stock
          </span>
          <Input
            type="number"
            min={0}
            value={confirmed}
            onChange={(e) => setConfirmed(e.target.value)}
            className="h-9 w-28 rounded-xl"
            aria-label="Digital stock to set"
          />
          <Button
            size="sm"
            className="h-9 rounded-xl"
            onClick={() => sync.mutate()}
            disabled={sync.isPending || confirmed === '' || Number(confirmed) < 0}
          >
            {sync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Sync digital stock
          </Button>
        </div>
      )}
    </div>
  )
}
