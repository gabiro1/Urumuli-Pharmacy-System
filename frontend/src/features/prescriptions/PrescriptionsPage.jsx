import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  FileText,
  Loader2,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import api from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'REJECTED', label: 'Rejected' },
]

const STATUS_LABEL = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
}

const STATUS_BADGE = {
  PENDING: 'yellow',
  UNDER_REVIEW: 'blue',
  APPROVED: 'green',
  COMPLETED: 'purple',
  REJECTED: 'red',
}

const URGENCY_OPTIONS = [
  { value: 'all', label: 'All Urgency' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'STAT', label: 'Stat' },
]

const PAGE_SIZE = 10

function PrescriptionFile({ fileUrl, fileType }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ loading: true, objectUrl: null, isImage: false, error: null })

  useEffect(() => {
    if (!fileUrl) return
    let cancelled = false
    let objectUrl = null

    setState({ loading: true, objectUrl: null, isImage: false, error: null })
    api.get(fileUrl, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return
        const mimeType = response.data?.type || fileType || ''
        objectUrl = URL.createObjectURL(response.data)
        setState({ loading: false, objectUrl, isImage: mimeType.startsWith('image/'), error: null })
      })
      .catch((error) => {
        if (cancelled) return
        setState({
          loading: false,
          objectUrl: null,
          isImage: false,
          error: error.response?.data?.message || 'Unable to load the prescription file',
        })
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileUrl, fileType, attempt])

  const openInNewTab = () => {
    if (!state.objectUrl) return
    const popup = window.open(state.objectUrl, '_blank', 'noopener,noreferrer')
    if (!popup) {
      const link = document.createElement('a')
      link.href = state.objectUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.click()
    }
  }

  if (state.loading) {
    return <Skeleton className="h-56 w-full rounded-lg" />
  }

  if (state.error) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">{state.error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setAttempt((a) => a + 1)}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden border bg-muted/30">
        {state.isImage ? (
          <img src={state.objectUrl} alt="Prescription" className="w-full max-h-96 object-contain" />
        ) : (
          <iframe src={state.objectUrl} title="Prescription file" className="w-full h-96" />
        )}
      </div>
      <Button variant="outline" size="sm" onClick={openInNewTab}>
        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
        Open in new tab
      </Button>
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
                      {data.patientDob && (
                        <p className="text-xs text-muted-foreground">
                          DOB: {format(new Date(data.patientDob), 'PP')}
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
                          <p className="text-sm font-medium">{data.prescriberName || data.doctorName || 'N/A'}</p>
                          {data.doctorLicenseNumber && (
                            <p className="text-xs text-muted-foreground font-mono">
                              License: {data.doctorLicenseNumber}
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
                            <p className="text-sm font-medium truncate">{med.name || med.medicineName}</p>
                            <p className="text-xs text-muted-foreground">
                              {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' \u00b7 ') || 'No dosing details'}
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

                {data.fileUrl && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Prescription File
                    </h4>
                    <PrescriptionFile fileUrl={data.fileUrl} fileType={data.fileType} />
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

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    urgency: 'all',
    dateFrom: '',
    dateTo: '',
    pharmacist: '',
  })
  const [page, setPage] = useState(1)
  const [selectedPrescription, setSelectedPrescription] = useState(null)

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

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filters])

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (filters.urgency !== 'all') params.set('urgency', filters.urgency)
    if (filters.dateFrom) params.set('fromDate', filters.dateFrom)
    if (filters.dateTo) params.set('toDate', filters.dateTo)
    if (filters.pharmacist) params.set('pharmacist', filters.pharmacist)
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    return params.toString()
  }, [debouncedSearch, filters, page])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['prescriptions', queryParams],
    queryFn: () => api.get(`/prescriptions?${queryParams}`).then((r) => r.data),
  })

  const rows = data?.data || []
  const meta = data?.meta
  const totalPages = meta?.totalPages || 1
  const currentPage = meta?.page || 1
  const pageStart = rows.length === 0 ? 0 : (currentPage - 1) * (meta?.limit || PAGE_SIZE) + 1
  const pageEnd = rows.length === 0 ? 0 : Math.min(currentPage * (meta?.limit || PAGE_SIZE), meta?.total ?? 0)

  const hasActiveFilters =
    debouncedSearch ||
    filters.status !== 'all' ||
    filters.urgency !== 'all' ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.pharmacist

  const clearAllFilters = () => {
    setFilters({ status: 'all', urgency: 'all', dateFrom: '', dateTo: '', pharmacist: '' })
    setSearch('')
    setPage(1)
  }

  const selectStatus = (status) => {
    setFilters((prev) => ({ ...prev, status }))
  }

  const renderUrgency = (urgency) => {
    if (urgency === 'URGENT' || urgency === 'STAT') {
      return (
        <span className={cn(
          'inline-flex items-center gap-1 text-xs font-medium',
          urgency === 'STAT' ? 'text-red-500' : 'text-amber-500'
        )}>
          <AlertCircle className="w-3.5 h-3.5" />
          {urgency}
        </span>
      )
    }
    return <span className="text-xs text-muted-foreground">—</span>
  }

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
            Review, approve, and track prescription workflows
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => navigate('/app/prescriptions/create')}>
            <Plus className="w-4 h-4 mr-2" />
            New Prescription
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectStatus(tab.id)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors border',
              filters.status === tab.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name, ID, doctor, or phone..."
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
          {(filters.urgency !== 'all' || filters.dateFrom || filters.dateTo || filters.pharmacist) && (
            <span className="ml-2 w-2 h-2 rounded-full bg-primary" />
          )}
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
                    Clear search & filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              <Skeleton className="h-4 w-1/3" />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
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
      ) : rows.length === 0 ? (
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
              {hasActiveFilters
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Medicines</TableHead>
                  <TableHead>Pharmacist</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-6 text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((rx) => {
                  const initials = (rx.patientName || 'UN')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  return (
                    <TableRow
                      key={rx.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedPrescription(rx)}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium leading-tight truncate">{rx.patientName}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              #{rx.prescriptionId || rx.id?.slice(-8).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge color={STATUS_BADGE[rx.status] || 'default'}>
                          {STATUS_LABEL[rx.status] || rx.status?.replace('_', ' ') || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderUrgency(rx.urgency)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Pill className="w-3.5 h-3.5" />
                          {rx.medicineCount ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {rx.pharmacistName || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {rx.createdAt ? formatRelativeTime(rx.createdAt) : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {pageStart}–{pageEnd} of {meta?.total || 0} prescriptions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <PrescriptionDetailDrawer
        prescription={selectedPrescription}
        open={!!selectedPrescription}
        onOpenChange={(open) => !open && setSelectedPrescription(null)}
      />
    </motion.div>
  )
}