import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Loader2, MessageSquareText, Pill } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { clearAvailabilityDraft, saveAvailabilityDraft } from '@/lib/availability'

export function AvailabilityRequestDialog({ open, onOpenChange, medicineId, medicineName, message = '' }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [note, setNote] = useState(message || '')

  const create = useMutation({
    mutationFn: () =>
      api.post('/availability/requests', {
        medicineId: medicineId || null,
        medicineName,
        message: note.trim() || undefined,
      }),
    onSuccess: (res) => {
      const conversationId = res?.data?.data?.conversationId
      clearAvailabilityDraft()
      onOpenChange(false)
      setNote('')
      qc.invalidateQueries({ queryKey: ['patient-conversations'] })
      toast.success('We have asked the pharmacy to check this medicine')
      if (conversationId) navigate(`/patient/messages/${conversationId}`)
    },
    onError: (error) => {
      if (error?.response?.status === 401) {
        saveAvailabilityDraft({ medicineId: medicineId || null, medicineName, message: note.trim() })
        onOpenChange(false)
        navigate('/login?redirect=/patient/messages')
        toast.error('Please sign in again to message the pharmacist')
        return
      }
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Could not reach the pharmacist right now')
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) clearAvailabilityDraft(); onOpenChange(isOpen) }}>
      <DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <div className="bg-primary px-6 py-6 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl">Ask the pharmacist</DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-sm text-primary-foreground/70">
            We will ask the pharmacy to check if this medicine is physically available.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
          className="space-y-4 p-6"
        >
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Pill className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{medicineName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The pharmacist will confirm whether it is on the shelves right now.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Anything we should tell the pharmacist? (optional)"
              className="rounded-xl"
            />
          </div>
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={create.isPending}>
            {create.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Asking…
              </>
            ) : (
              <>
                <MessageSquareText className="mr-2 h-4 w-4" />
                Ask the pharmacist
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AskPharmacistButton({
  medicineId,
  medicineName,
  message = '',
  label = 'Ask a pharmacist',
  variant = 'outline',
  size = 'default',
  className,
}) {
  const navigate = useNavigate()
  const isAuthenticated = usePatientAuthStore((s) => s.isAuthenticated)
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    if (!isAuthenticated) {
      saveAvailabilityDraft({ medicineId: medicineId || null, medicineName, message: message || '' })
      navigate('/login?redirect=/patient/messages')
      return
    }
    setOpen(true)
  }

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={handleClick}>
        <MessageSquareText className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <AvailabilityRequestDialog
        open={open}
        onOpenChange={setOpen}
        medicineId={medicineId}
        medicineName={medicineName}
        message={message}
      />
    </>
  )
}
