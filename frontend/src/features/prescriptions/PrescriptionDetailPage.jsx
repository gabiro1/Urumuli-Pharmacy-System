import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  User,
  Stethoscope,
  Pill,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Phone,
  Image as ImageIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import api from '@/lib/api'
import { cn, formatRelativeTime, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthStore } from '@/stores/authStore'

function TimelineEntry({ status, by, timestamp, note, isLast }) {
  const statusColors = {
    PENDING: { dot: 'bg-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
    UNDER_REVIEW: { dot: 'bg-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    APPROVED: { dot: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    COMPLETED: { dot: 'bg-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
    REJECTED: { dot: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  }
  const colors = statusColors[status] || { dot: 'bg-muted-foreground', bg: 'bg-muted', text: 'text-muted-foreground' }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn('w-3 h-3 rounded-full ring-2 ring-background shrink-0', colors.dot)} />
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>
      <div className={cn('pb-6', isLast && 'pb-0')}>
        <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', colors.bg, colors.text)}>
          {status?.replace('_', ' ')}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {by && <>by <span className="font-medium">{by}</span></>}
          {timestamp && <>{by ? ' — ' : ''}{formatRelativeTime(timestamp)}</>}
        </p>
        {note && (
          <p className="text-xs text-muted-foreground mt-1 italic bg-muted/50 rounded-md p-2 border">
            &ldquo;{note}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}

export default function PrescriptionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const hasRole = useAuthStore((s) => s.hasRole)
  const canAct = hasRole('PHARMACIST') || hasRole('ADMIN')

  const [rejectDialog, setRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [pharmacistNotes, setPharmacistNotes] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => api.get(`/prescriptions/${id}`).then((r) => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ action }) => {
      const endpoint = action === 'APPROVED' ? 'approve' : action === 'COMPLETED' ? 'complete' : action === 'UNDER_REVIEW' ? 'review' : 'reject'
      return api.post(`/prescriptions/${id}/${endpoint}`, { rejectionReason: rejectReason || undefined, pharmacistNotes: pharmacistNotes || undefined })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription', id] })
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      toast.success('Prescription updated successfully')
      setRejectDialog(false)
      setRejectReason('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update prescription')
    },
  })

  const prescription = data?.data || data

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-60 rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </motion.div>
    )
  }

  if (isError) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/prescriptions')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <p className="text-muted-foreground">
            {error.response?.data?.message || 'Prescription not found'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/prescriptions')}>
              Back to Prescriptions
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  if (!prescription) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/prescriptions')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FileText className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Prescription not found</p>
        </div>
      </motion.div>
    )
  }

  const initials = (prescription.patientName || 'UN').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const statusHistory = prescription.statusHistory || []
  const allergies = prescription.patientAllergies || []
  const medicines = prescription.medicines || []

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'yellow',
      UNDER_REVIEW: 'blue',
      APPROVED: 'green',
      COMPLETED: 'purple',
      REJECTED: 'red',
    }
    return <Badge color={colors[status] || 'default'}>{status?.replace('_', ' ')}</Badge>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/prescriptions')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Prescription #{prescription.prescriptionId || id?.slice(-8).toUpperCase()}
              </h1>
              {getStatusBadge(prescription.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatRelativeTime(prescription.createdAt)}
              {prescription.updatedAt && prescription.updatedAt !== prescription.createdAt && (
                <> &middot; Updated {formatRelativeTime(prescription.updatedAt)}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(prescription.fileUrl || prescription.file_url) && (
            <Button variant="outline" asChild>
              <a href={prescription.fileUrl || prescription.file_url} target="_blank" rel="noopener noreferrer">
                <ImageIcon className="w-4 h-4 mr-2" />
                View Document
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{prescription.patientName}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {prescription.patientPhone || 'N/A'}
                    </span>
                    {prescription.patientDOB && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(prescription.patientDOB), 'PP')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {allergies.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      Allergy Alert
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {allergies.map((allergy, i) => (
                        <Badge key={i} color="red" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(!allergies || allergies.length === 0) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    No known allergies
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="w-4 h-4 text-muted-foreground" />
                Prescribed Medicines ({medicines.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {medicines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medicines listed</p>
              ) : (
                <div className="space-y-3">
                  {medicines.map((med, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground shrink-0">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{med.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {med.dosage} &middot; {med.frequency} &middot; {med.duration}
                          </p>
                        </div>
                      </div>
                      {med.notes && (
                        <p className="text-xs text-muted-foreground hidden sm:block ml-4 max-w-[200px] truncate">
                          {med.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                Prescriber Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
                  <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">{prescription.prescriberName || 'N/A'}</p>
                  {prescription.prescriberLicense && (
                    <p className="text-xs text-muted-foreground font-mono">
                      License: {prescription.prescriberLicense}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {prescription.imageUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  Prescription Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden border bg-muted/30">
                  {prescription.imageUrl.match(/\.pdf$/i) ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <FileText className="w-12 h-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">PDF Document</p>
                      <Button variant="outline" asChild>
                        <a href={prescription.imageUrl} target="_blank" rel="noopener noreferrer">
                          Open PDF
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <img
                      src={prescription.imageUrl}
                      alt="Prescription"
                      className="w-full h-64 object-contain cursor-pointer"
                      onClick={() => window.open(prescription.imageUrl, '_blank')}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {canAct && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Pharmacist Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={pharmacistNotes || prescription.pharmacistNotes || ''}
                  onChange={(e) => setPharmacistNotes(e.target.value)}
                  placeholder="Add your professional notes about this prescription..."
                  className="w-full min-h-[120px] rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No status history available</p>
              ) : (
                <div className="ml-1">
                  {statusHistory.map((entry, i) => (
                    <TimelineEntry
                      key={i}
                      {...entry}
                      isLast={i === statusHistory.length - 1}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {canAct && prescription.status !== 'COMPLETED' && prescription.status !== 'REJECTED' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prescription.status === 'PENDING' && (
                  <Button
                    className="w-full"
                    onClick={() => statusMutation.mutate({ action: 'UNDER_REVIEW' })}
                    disabled={statusMutation.isPending}
                  >
                    {statusMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Mark as Under Review
                  </Button>
                )}
                {(prescription.status === 'UNDER_REVIEW' || prescription.status === 'PENDING') && (
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => statusMutation.mutate({ action: 'APPROVED' })}
                    disabled={statusMutation.isPending}
                  >
                    {statusMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                )}
                {prescription.status === 'APPROVED' && (
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => statusMutation.mutate({ action: 'COMPLETED' })}
                    disabled={statusMutation.isPending}
                  >
                    {statusMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Completed
                  </Button>
                )}
                {prescription.status !== 'COMPLETED' && prescription.status !== 'REJECTED' && (
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => setRejectDialog(true)}
                    disabled={statusMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prescription ID</span>
                <span className="font-mono font-medium">#{prescription.prescriptionId || id?.slice(-8).toUpperCase()}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Urgency</span>
                <Badge color={prescription.urgency === 'STAT' ? 'red' : prescription.urgency === 'URGENT' ? 'yellow' : 'default'} className="text-xs">
                  {prescription.urgency || 'NORMAL'}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(prescription.createdAt)}</span>
              </div>
              <Separator />
              {prescription.updatedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{formatDate(prescription.updatedAt)}</span>
                  </div>
                  <Separator />
                </>
              )}
              {prescription.pharmacistName && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pharmacist</span>
                    <span className="font-medium">{prescription.pharmacistName}</span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Medicines</span>
                <span className="font-medium">{medicines.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reject Prescription
            </DialogTitle>
            <DialogDescription>
              This will reject prescription #{prescription.prescriptionId || id?.slice(-8).toUpperCase()}. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejecting this prescription..."
                className="w-full min-h-[120px] rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || statusMutation.isPending}
              onClick={() => statusMutation.mutate({ action: 'REJECTED' })}
            >
              {statusMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rejecting...</>
              ) : (
                <><XCircle className="w-4 h-4 mr-2" />Reject</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
