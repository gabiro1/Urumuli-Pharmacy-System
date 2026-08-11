import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  X,
  AlertTriangle,
  RefreshCw,
  Pill,
  Clock,
  AlertCircle,
  User,
  Stethoscope,
  ChevronRight,
  FileText,
  Loader2,
  Calendar,
  GripVertical,
  Plus,
} from 'lucide-react'
import { format } from 'date-fns'
import api from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

const COLUMNS = [
  { id: 'PENDING', label: 'Pending', color: 'yellow' },
  { id: 'UNDER_REVIEW', label: 'Under Review', color: 'blue' },
  { id: 'APPROVED', label: 'Approved', color: 'green' },
  { id: 'COMPLETED', label: 'Completed', color: 'purple' },
]

const URGENCY_OPTIONS = [
  { value: 'all', label: 'All Urgency' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'STAT', label: 'Stat' },
]

const STATUS_TRANSITIONS = {
  PENDING: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'PENDING'],
  APPROVED: ['COMPLETED', 'UNDER_REVIEW'],
  COMPLETED: [],
}

function PrescriptionCard({ prescription, onDragStart, onClick }) {
  const initials = (prescription.patientName || 'UN')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const urgencyColors = {
    NORMAL: 'border-l-green-500',
    URGENT: 'border-l-amber-500',
    STAT: 'border-l-red-500',
  }

  const statusLabel = { PENDING: 'Pending', UNDER_REVIEW: 'Under Review', APPROVED: 'Approved', COMPLETED: 'Completed' }
  const statusColors = { PENDING: 'yellow', UNDER_REVIEW: 'blue', APPROVED: 'green', COMPLETED: 'purple' }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={(e) => onDragStart(e, prescription)}
      onClick={() => onClick(prescription)}
      className={cn(
        'group relative cursor-grab active:cursor-grabbing rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50 border-l-4',
        urgencyColors[prescription.urgency] || 'border-l-transparent'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {prescription.patientName}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              #{prescription.prescriptionId || prescription.id?.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
        <Badge color={statusColors[prescription.status]} className="text-[10px] px-1.5 py-0 shrink-0">
          {statusLabel[prescription.status]}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Pill className="w-3 h-3" />
          {(prescription.medicines || []).length} meds
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(prescription.createdAt)}
        </span>
        {(prescription.urgency === 'URGENT' || prescription.urgency === 'STAT') && (
          <span className={cn(
            'flex items-center gap-1 font-medium',
            prescription.urgency === 'STAT' ? 'text-red-500' : 'text-amber-500'
          )}>
            <AlertCircle className="w-3 h-3" />
            {prescription.urgency}
          </span>
        )}
      </div>

      {prescription.pharmacistName && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
          <User className="w-3 h-3" />
          <span className="truncate">{prescription.pharmacistName}</span>
        </div>
      )}

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.div>
  )
}

function ColumnSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-lg" />
      ))}
    </div>
  )
}

function PrescriptionDetailDrawer({ prescription, open, onOpenChange }) {
  const queryClient = useQueryClient()

  const detailQuery = useQuery({
    queryKey: ['prescription', prescription?.id],
    queryFn: () => api.get(`/prescriptions/${prescription.id}`).then((r) => r.data),
    enabled: !!prescription?.id,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, action }) => {
      const endpoint = action === 'APPROVED' ? 'approve' : action === 'COMPLETED' ? 'complete' : action === 'UNDER_REVIEW' ? 'review' : 'reject'
      const payload = action === 'REJECTED'
        ? { rejectionReason: rejectReason || 'Rejected by pharmacist', pharmacistNotes: pharmacistNote || undefined }
        : action === 'APPROVED'
          ? { pharmacistNotes: pharmacistNote || undefined }
          : {}
      return api.post(`/prescriptions/${id}/${endpoint}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['prescription', prescription?.id] })
      toast.success('Prescription status updated')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update prescription')
    },
  })

  const [rejectDialog, setRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [pharmacistNote, setPharmacistNote] = useState('')

  const data = detailQuery.data?.data || prescription || {}
  const statusHistory = data.statusHistory || []
  const canAct = data.status !== 'COMPLETED'

  const initials = (data.patientName || 'UN').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const getStatusColor = (s) => ({
    PENDING: 'yellow',
    UNDER_REVIEW: 'blue',
    APPROVED: 'green',
    COMPLETED: 'purple',
    REJECTED: 'red',
  })[s] || 'default'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              Prescription #{data.prescriptionId || data.id?.slice(-8).toUpperCase()}
              <Badge color={getStatusColor(data.status)} className="ml-auto">
                {data.status?.replace('_', ' ')}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-8rem)] pr-4">
            {detailQuery.isLoading ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Patient Info
                      </h4>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{data.patientName}</p>
                          <p className="text-xs text-muted-foreground">{data.patientPhone}</p>
                        </div>
                      </div>
                      {data.patientDOB && (
                        <p className="text-xs text-muted-foreground">
                          DOB: {format(new Date(data.patientDOB), 'PP')}
                        </p>
                      )}
                      {data.patientAllergies && data.patientAllergies.length > 0 && (
                        <div className="flex items-start gap-1.5 p-2 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-red-700 dark:text-red-300">Allergies</p>
                            <p className="text-xs text-red-600 dark:text-red-400">{data.patientAllergies.join(', ')}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Prescriber
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50">
                          <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{data.prescriberName || 'N/A'}</p>
                          {data.prescriberLicense && (
                            <p className="text-xs text-muted-foreground font-mono">
                              License: {data.prescriberLicense}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {formatRelativeTime(data.createdAt)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Prescribed Medicines ({data.medicines?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {(data.medicines || []).map((med, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground shrink-0">
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
                          <p className="text-xs text-muted-foreground hidden sm:block ml-4">{med.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {data.imageUrl && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Prescription Image
                    </h4>
                    <div className="rounded-lg overflow-hidden border bg-muted/30">
                      <img
                        src={data.imageUrl}
                        alt="Prescription"
                        className="w-full h-48 object-contain"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Pharmacist Notes
                  </h4>
                  <textarea
                    value={pharmacistNote || data.pharmacistNotes || ''}
                    onChange={(e) => setPharmacistNote(e.target.value)}
                    placeholder="Add notes about this prescription..."
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                {statusHistory.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Status Timeline
                    </h4>
                    <div className="space-y-3">
                      {statusHistory.map((entry, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'w-2.5 h-2.5 rounded-full mt-1.5',
                              getStatusColor(entry.status) === 'green' && 'bg-green-500',
                              getStatusColor(entry.status) === 'yellow' && 'bg-yellow-500',
                              getStatusColor(entry.status) === 'blue' && 'bg-blue-500',
                              getStatusColor(entry.status) === 'purple' && 'bg-purple-500',
                              getStatusColor(entry.status) === 'red' && 'bg-red-500',
                              getStatusColor(entry.status) === 'default' && 'bg-muted-foreground'
                            )} />
                            {i < statusHistory.length - 1 && (
                              <div className="w-px flex-1 bg-border" />
                            )}
                          </div>
                          <div className="pb-3">
                            <p className="text-sm font-medium">
                              {entry.status?.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.by && `by ${entry.by}`}
                              {entry.timestamp && ` — ${formatRelativeTime(entry.timestamp)}`}
                            </p>
                            {entry.note && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">
                                &ldquo;{entry.note}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canAct && (
                  <div className="flex items-center gap-2 pt-2">
                    {data.status === 'PENDING' && (
                      <Button
                        onClick={() => statusMutation.mutate({ id: data.id, action: 'UNDER_REVIEW' })}
                        disabled={statusMutation.isPending}
                      >
                        Review
                      </Button>
                    )}
                    {(data.status === 'UNDER_REVIEW' || data.status === 'PENDING') && (
                      <Button
                        variant="default"
                        onClick={() => statusMutation.mutate({ id: data.id, action: 'APPROVED' })}
                        disabled={statusMutation.isPending}
                      >
                        Approve
                      </Button>
                    )}
                    {data.status === 'APPROVED' && (
                      <Button
                        variant="default"
                        onClick={() => statusMutation.mutate({ id: data.id, action: 'COMPLETED' })}
                        disabled={statusMutation.isPending}
                      >
                        Complete
                      </Button>
                    )}
                    {data.status !== 'COMPLETED' && data.status !== 'REJECTED' && (
                      <Button
                        variant="destructive"
                        onClick={() => setRejectDialog(true)}
                        disabled={statusMutation.isPending}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reject Prescription
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this prescription.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || statusMutation.isPending}
              onClick={() => {
                statusMutation.mutate({ id: data.id, action: 'REJECTED' })
                setRejectDialog(false)
                setRejectReason('')
              }}
            >
              {statusMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rejecting...</>
              ) : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function PrescriptionsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    urgency: 'all',
    dateFrom: '',
    dateTo: '',
    pharmacist: '',
  })
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [draggedItem, setDraggedItem] = useState(null)

  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (filters.urgency !== 'all') params.set('urgency', filters.urgency)
    if (filters.dateFrom) params.set('fromDate', filters.dateFrom)
    if (filters.dateTo) params.set('toDate', filters.dateTo)
    if (filters.pharmacist) params.set('pharmacist', filters.pharmacist)
    return params.toString()
  }, [debouncedSearch, filters])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['prescriptions', queryParams],
    queryFn: () => api.get(`/prescriptions?${queryParams}`).then((r) => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/prescriptions/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      toast.success('Prescription moved')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update status')
    },
  })

  const allPrescriptions = data?.data?.prescriptions || data?.data || []

  const columns = useMemo(() => {
    const grouped = { PENDING: [], UNDER_REVIEW: [], APPROVED: [], COMPLETED: [], REJECTED: [] }
    allPrescriptions.forEach((p) => {
      const status = p.status || 'PENDING'
      if (grouped[status]) {
        grouped[status].push(p)
      } else {
        grouped.PENDING.push(p)
      }
    })
    return COLUMNS.map((col) => ({
      ...col,
      items: grouped[col.id] || [],
    }))
  }, [allPrescriptions])

  const handleDragStart = useCallback((e, prescription) => {
    setDraggedItem(prescription)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', prescription.id || prescription._id)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e, targetStatus) => {
      e.preventDefault()
      if (!draggedItem) return

      const sourceStatus = draggedItem.status
      const allowedTargets = STATUS_TRANSITIONS[sourceStatus] || []

      if (!allowedTargets.includes(targetStatus)) {
        toast.error(`Cannot move from ${sourceStatus} to ${targetStatus}`)
        setDraggedItem(null)
        return
      }

      if (sourceStatus !== targetStatus) {
        statusMutation.mutate({ id: draggedItem.id || draggedItem._id, status: targetStatus })
      }

      setDraggedItem(null)
    },
    [draggedItem, statusMutation]
  )

  const hasActiveFilters = filters.urgency !== 'all' || filters.dateFrom || filters.dateTo || filters.pharmacist

  const clearAllFilters = () => {
    setFilters({ urgency: 'all', dateFrom: '', dateTo: '', pharmacist: '' })
    setSearch('')
  }

  const getCardCount = (status) => columns.find((c) => c.id === status)?.items?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prescriptions</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track prescription workflows
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="shrink-0 h-11">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or prescription ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn('h-11', showFilters && 'border-primary')}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && <span className="ml-2 w-2 h-2 rounded-full bg-primary" />}
        </Button>
        <Button variant="outline" onClick={() => refetch()} className="h-11">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Urgency</label>
                    <Select
                      value={filters.urgency}
                      onValueChange={(v) => setFilters((p) => ({ ...p, urgency: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Date From</label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Date To</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Pharmacist</label>
                    <Input
                      placeholder="Search pharmacist..."
                      value={filters.pharmacist}
                      onChange={(e) => setFilters((p) => ({ ...p, pharmacist: e.target.value }))}
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="mt-3 text-muted-foreground">
                    <X className="w-3 h-3 mr-1" />
                    Clear all filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <Card key={col.id}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <ColumnSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <p className="text-muted-foreground">
            {error.response?.data?.message || 'Failed to load prescriptions'}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : allPrescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="p-4 rounded-2xl bg-muted">
              <FileText className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No prescriptions found</h3>
            <p className="text-muted-foreground max-w-sm text-center">
              {debouncedSearch || hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'No prescriptions have been created yet'}
            </p>
            <Button onClick={() => navigate('/app/prescriptions/create')} className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              New Prescription
            </Button>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => (
            <Card
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className={cn(
                'transition-colors',
                draggedItem && STATUS_TRANSITIONS[draggedItem.status]?.includes(column.id) && 'border-primary/50 bg-primary/5'
              )}
            >
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    column.color === 'yellow' && 'bg-yellow-500',
                    column.color === 'blue' && 'bg-blue-500',
                    column.color === 'green' && 'bg-green-500',
                    column.color === 'purple' && 'bg-purple-500',
                  )} />
                  <CardTitle className="text-sm font-semibold">{column.label}</CardTitle>
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {getCardCount(column.id)}
                </span>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="popLayout">
                  {column.items.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <p className="text-xs">No prescriptions</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      {column.items.map((prescription) => (
                        <PrescriptionCard
                          key={prescription.id || prescription._id}
                          prescription={prescription}
                          onDragStart={handleDragStart}
                          onClick={setSelectedPrescription}
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PrescriptionDetailDrawer
        prescription={selectedPrescription}
        open={!!selectedPrescription}
        onOpenChange={(open) => !open && setSelectedPrescription(null)}
      />
    </motion.div>
  )
}
