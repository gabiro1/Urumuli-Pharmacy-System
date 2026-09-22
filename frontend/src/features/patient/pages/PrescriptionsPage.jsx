import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, Clock, FileText, Loader2, Upload, XCircle } from 'lucide-react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/apiError'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PatientPageHeader, PatientPageShell } from '../components/PatientPageShell'

const statusConfig = {
  PENDING: { label: 'Pending', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', icon: Clock },
  UNDER_REVIEW: { label: 'Under review', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', icon: Clock },
  APPROVED: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', icon: CheckCircle },
  REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive', icon: XCircle },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', icon: CheckCircle },
}

export default function PrescriptionsPage() {
  const queryClient = useQueryClient()
  const fileRef = useRef(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [doctorName, setDoctorName] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)

  const prescriptionsQuery = useQuery({
    queryKey: ['patient-prescriptions'],
    queryFn: () => api.get('/prescriptions/my').then((response) => response.data.data || []),
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const created = await api.post('/prescriptions/submit', {
        doctorName: doctorName.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      const prescription = created.data.data
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/prescriptions/${prescription.id}/upload`, formData)
      return prescription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] })
      setUploadOpen(false)
      setDoctorName('')
      setNotes('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      toast.success('Prescription submitted successfully')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not upload prescription')),
  })

  const submit = (event) => {
    event.preventDefault()
    if (!file) return toast.error('Select a prescription image or PDF')
    uploadMutation.mutate()
  }

  const prescriptions = prescriptionsQuery.data || []
  const uploadButton = (
    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 rounded-xl"><Upload className="mr-2 h-4 w-4" /> Upload prescription</Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-md">
        <div className="border-b border-border/70 px-6 py-5 pr-12">
          <DialogHeader>
            <DialogTitle>Upload prescription</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">Send a clear image or PDF for the pharmacy team to review.</p>
          </DialogHeader>
        </div>
        <form className="space-y-4 p-6" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="prescriptionFile">Prescription image or PDF</Label>
            <Input ref={fileRef} id="prescriptionFile" type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required className="h-11 rounded-xl" />
            <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, or PDF; maximum 10 MB.</p>
          </div>
          <div className="space-y-2"><Label htmlFor="doctorName">Doctor name <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="doctorName" value={doctorName} onChange={(event) => setDoctorName(event.target.value)} className="h-11 rounded-xl" /></div>
          <div className="space-y-2"><Label htmlFor="notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="rounded-xl" /></div>
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Submit prescription'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )

  return (
    <PatientPageShell className="max-w-5xl">
      <PatientPageHeader
        eyebrow="Your care"
        title="Prescriptions"
        description="Upload a prescription and follow its review status from the pharmacy team."
        action={uploadButton}
      />

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardContent className="p-0">
          {prescriptionsQuery.isLoading ? (
            <div className="flex justify-center p-14"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : prescriptionsQuery.isError ? (
            <div className="p-10 text-center"><p className="text-sm text-destructive">{getApiErrorMessage(prescriptionsQuery.error, 'Could not load prescriptions')}</p><Button variant="outline" className="mt-4 rounded-xl" onClick={() => prescriptionsQuery.refetch()}>Try again</Button></div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center p-12 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><FileText className="h-7 w-7" /></span>
              <h2 className="mt-5 font-semibold">No prescriptions yet</h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Upload a prescription from your doctor to get it reviewed by the pharmacy team.</p>
              <Button className="mt-5 h-10 rounded-xl" onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" /> Upload your first prescription</Button>
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {prescriptions.map((prescription) => {
                const config = statusConfig[prescription.status] || statusConfig.PENDING
                const Icon = config.icon
                return (
                  <div key={prescription.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><FileText className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">Prescription #{prescription.prescriptionId}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{prescription.doctorName || 'Doctor not provided'} · {new Date(prescription.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge className={`w-fit text-[10px] sm:text-xs ${config.className}`}><Icon className="mr-1 h-3.5 w-3.5" />{config.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PatientPageShell>
  )
}
