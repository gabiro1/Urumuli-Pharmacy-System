import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { FileText, Upload, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/apiError'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const statusConfig = {
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-blue-100 text-blue-700', icon: Clock },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700', icon: XCircle },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
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

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prescriptions</h1>
          <p className="text-sm text-muted-foreground">Upload and track your prescriptions</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild><Button><Upload className="mr-2 h-4 w-4" /> Upload Prescription</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Upload Prescription</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="prescriptionFile">Prescription Image / PDF</Label>
                <Input ref={fileRef} id="prescriptionFile" type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
                <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, or PDF; maximum 10 MB.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctorName">Doctor name (optional)</Label>
                <Input id="doctorName" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : 'Upload'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Your Prescriptions</CardTitle></CardHeader>
        <CardContent>
          {prescriptionsQuery.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : prescriptionsQuery.isError ? (
            <div className="py-10 text-center"><p className="text-sm text-destructive">{getApiErrorMessage(prescriptionsQuery.error, 'Could not load prescriptions')}</p><Button variant="outline" className="mt-4" onClick={() => prescriptionsQuery.refetch()}>Try again</Button></div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-full bg-muted mb-4"><FileText className="h-8 w-8 text-muted-foreground" /></div>
              <h3 className="text-lg font-semibold mb-2">No prescriptions yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Upload a prescription from your doctor to get it reviewed.</p>
              <Button onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" /> Upload Your First Prescription</Button>
            </div>
          ) : (
            <div className="divide-y">
              {prescriptions.map((prescription) => {
                const config = statusConfig[prescription.status] || statusConfig.PENDING
                const Icon = config.icon
                return <div key={prescription.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2"><FileText className="h-5 w-5" /></div>
                    <div><p className="font-medium">Prescription #{prescription.prescriptionId}</p><p className="text-sm text-muted-foreground">{prescription.doctorName || 'Doctor not provided'} · {new Date(prescription.createdAt).toLocaleDateString()}</p></div>
                  </div>
                  <Badge className={config.className}><Icon className="mr-1 h-3.5 w-3.5" />{config.label}</Badge>
                </div>
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
