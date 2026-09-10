import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Building2,
  Plus,
  Search,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  Eye,
  MoreHorizontal,
  Info,
  FileText,
} from 'lucide-react'
import api from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ============================================================
// CONSTANTS
// ============================================================

const PHARMACY_STATUS = {
  PENDING: { label: 'Pending Review', color: 'yellow', icon: Clock },
  ACTIVE: { label: 'Active', color: 'green', icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspended', color: 'orange', icon: Ban },
  REJECTED: { label: 'Rejected', color: 'red', icon: XCircle },
}

const ITEMS_PER_PAGE = 10

// ============================================================
// BADGE COMPONENTS
// ============================================================

function PharmacyStatusBadge({ status }) {
  const config = PHARMACY_STATUS[status] || { label: status, color: 'gray', icon: Clock }
  const Icon = config.icon
  return (
    <Badge color={config.color} className="gap-1 text-xs font-medium">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

// ============================================================
// CREATE PHARMACY DIALOG
// ============================================================

function CreatePharmacyDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    registrationNumber: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    province: '',
    country: 'Rwanda',
    description: '',
  })
  const [errors, setErrors] = useState({})

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/pharmacies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacies'] })
      toast.success('Pharmacy created successfully')
      onOpenChange(false)
      setForm({
        name: '', registrationNumber: '', contactEmail: '', contactPhone: '',
        address: '', city: '', province: '', country: 'Rwanda', description: '',
      })
      setErrors({})
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create pharmacy'
      toast.error(msg)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Pharmacy name is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    const payload = { ...form }
    // Remove empty optional fields
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' && key !== 'name' && key !== 'country') {
        delete payload[key]
      }
    })
    createMutation.mutate(payload)
  }

  const handleChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Register New Pharmacy
          </DialogTitle>
          <DialogDescription>
            Create a new pharmacy organization. You will be assigned as its manager.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Pharmacy Name *</Label>
            <Input
              placeholder="e.g. Urumuli Pharmacy"
              value={form.name}
              onChange={handleChange('name')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Registration Number</Label>
              <Input
                placeholder="e.g. RC/2024/001"
                value={form.registrationNumber}
                onChange={handleChange('registrationNumber')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Country</Label>
              <Input
                value={form.country}
                onChange={handleChange('country')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contact Email</Label>
              <Input
                type="email"
                placeholder="info@pharmacy.com"
                value={form.contactEmail}
                onChange={handleChange('contactEmail')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contact Phone</Label>
              <Input
                type="tel"
                placeholder="+250 788 000 000"
                value={form.contactPhone}
                onChange={handleChange('contactPhone')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Address</Label>
            <Input
              placeholder="Street address"
              value={form.address}
              onChange={handleChange('address')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">City</Label>
              <Input
                placeholder="e.g. Kigali"
                value={form.city}
                onChange={handleChange('city')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Province</Label>
              <Input
                placeholder="e.g. Kigali City"
                value={form.province}
                onChange={handleChange('province')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              placeholder="Brief description of the pharmacy..."
              value={form.description}
              onChange={handleChange('description')}
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />Create Pharmacy</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// STATUS ACTION DIALOG (Approve / Reject / Suspend)
// ============================================================

function StatusActionDialog({ pharmacy, action, open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }) =>
      api.patch(`/pharmacies/${id}/status`, { status, reason: reason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacies'] })
      const actionLabels = { ACTIVE: 'approved', REJECTED: 'rejected', SUSPENDED: 'suspended' }
      toast.success(`Pharmacy ${actionLabels[action] || 'updated'}`)
      onOpenChange(false)
      setReason('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update status')
    },
  })

  if (!pharmacy || !action) return null

  const actionConfig = {
    ACTIVE: { label: 'Approve', color: 'bg-green-600 hover:bg-green-700', icon: CheckCircle2, description: 'This will activate the pharmacy and allow it to operate on the platform.' },
    REJECTED: { label: 'Reject', color: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', icon: XCircle, description: 'This will reject the pharmacy registration. The owner will be notified.' },
    SUSPENDED: { label: 'Suspend', color: 'bg-orange-600 hover:bg-orange-700', icon: Ban, description: 'This will suspend the pharmacy. All staff operations will be paused.' },
  }

  const config = actionConfig[action]
  const ActionIcon = config.icon

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ActionIcon className="w-5 h-5" />
            {config.label} Pharmacy
          </AlertDialogTitle>
          <AlertDialogDescription>
            {config.description}
            <br /><br />
            Are you sure you want to <strong>{config.label.toLowerCase()}</strong>{' '}
            <span className="font-medium text-foreground">{pharmacy.name}</span>?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Reason {action === 'ACTIVE' ? '(optional)' : '(required)'}
          </Label>
          <Textarea
            placeholder={
              action === 'ACTIVE'
                ? 'Optional note for approval...'
                : `Explain why this pharmacy is being ${action.toLowerCase()}d...`
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setReason('')}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={config.color}
            disabled={statusMutation.isPending || (action !== 'ACTIVE' && !reason.trim())}
            onClick={() =>
              statusMutation.mutate({
                id: pharmacy.id,
                status: action,
                reason,
              })
            }
          >
            {statusMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ActionIcon className="w-4 h-4 mr-2" />
            )}
            {config.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============================================================
// DETAIL DIALOG
// ============================================================

function PharmacyDetailDialog({ pharmacy, open, onOpenChange }) {
  if (!pharmacy) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {pharmacy.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <PharmacyStatusBadge status={pharmacy.status} />
            {pharmacy.status === 'REJECTED' && pharmacy.status_reason && (
              <p className="text-xs text-muted-foreground">Reason: {pharmacy.status_reason}</p>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {pharmacy.registration_number && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Registration #</p>
                  <p className="text-sm font-medium">{pharmacy.registration_number}</p>
                </div>
              </div>
            )}
            {pharmacy.contact_email && (
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{pharmacy.contact_email}</p>
                </div>
              </div>
            )}
            {pharmacy.contact_phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{pharmacy.contact_phone}</p>
                </div>
              </div>
            )}
            {pharmacy.country && (
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="text-sm font-medium">{pharmacy.country}</p>
                </div>
              </div>
            )}
          </div>

          {(pharmacy.address || pharmacy.city || pharmacy.province) && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium">
                  {[pharmacy.address, pharmacy.city, pharmacy.province].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}

          {pharmacy.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{pharmacy.description}</p>
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t">
            <p>Created: {pharmacy.created_at ? formatDate(pharmacy.created_at) : '—'}</p>
            {pharmacy.approved_at && (
              <p>Approved: {formatDate(pharmacy.approved_at)}</p>
            )}
            {pharmacy.suspended_at && (
              <p>Suspended: {formatDate(pharmacy.suspended_at)}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function PharmacyManagementPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [createDialog, setCreateDialog] = useState(false)
  const [detailPharmacy, setDetailPharmacy] = useState(null)
  const [statusAction, setStatusAction] = useState({ pharmacy: null, action: null })
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const {
    data: pharmaciesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['pharmacies'],
    queryFn: () => api.get('/pharmacies').then((r) => r.data),
  })

  const pharmacies = useMemo(() => {
    return pharmaciesData?.data || []
  }, [pharmaciesData])

  // Filter
  const filteredPharmacies = useMemo(() => {
    let result = pharmacies

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.registration_number || '').toLowerCase().includes(q) ||
          (p.contact_email || '').toLowerCase().includes(q) ||
          (p.city || '').toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter)
    }

    return result
  }, [pharmacies, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredPharmacies.length / ITEMS_PER_PAGE))
  const paginatedPharmacies = filteredPharmacies.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  // Stats
  const stats = useMemo(() => {
    const total = pharmacies.length
    const active = pharmacies.filter((p) => p.status === 'ACTIVE').length
    const pending = pharmacies.filter((p) => p.status === 'PENDING').length
    const suspended = pharmacies.filter((p) => p.status === 'SUSPENDED').length
    return { total, active, pending, suspended }
  }, [pharmacies])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacy Management</h1>
          <p className="text-muted-foreground mt-1">
            Register, review, and manage pharmacy organizations
          </p>
        </div>
        <Button onClick={() => setCreateDialog(true)} className="shrink-0 h-11">
          <Plus className="w-4 h-4 mr-2" />
          Register Pharmacy
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Ban className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.suspended}</p>
                <p className="text-xs text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, registration, email, or city..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-10 h-10"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              &times;
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className="h-10"
            >
              {s === 'ALL' ? 'All' : PHARMACY_STATUS[s]?.label || s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <p className="text-muted-foreground">
            {error?.response?.data?.message || 'Failed to load pharmacies'}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      ) : filteredPharmacies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 rounded-2xl bg-muted">
            <Building2 className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            {search || statusFilter !== 'ALL'
              ? 'No pharmacies match your filters'
              : 'No pharmacies registered yet'}
          </h3>
          <p className="text-muted-foreground text-sm max-w-sm text-center">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filters'
              : 'Register the first pharmacy to get started'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <Button onClick={() => setCreateDialog(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Register Pharmacy
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPharmacies.map((pharmacy) => (
                  <TableRow key={pharmacy.id} className="transition-colors hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {pharmacy.name?.charAt(0)?.toUpperCase() || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{pharmacy.name}</p>
                          {pharmacy.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {pharmacy.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pharmacy.registration_number || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {pharmacy.contact_email && (
                          <p className="flex items-center gap-1 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 shrink-0" />
                            {pharmacy.contact_email}
                          </p>
                        )}
                        {pharmacy.contact_phone && (
                          <p className="flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" />
                            {pharmacy.contact_phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[pharmacy.city, pharmacy.province].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell>
                      <PharmacyStatusBadge status={pharmacy.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDetailPharmacy(pharmacy)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {isSuperAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailPharmacy(pharmacy)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {pharmacy.status === 'PENDING' && (
                                <>
                                  <DropdownMenuItem
                                    className="text-green-600"
                                    onClick={() => setStatusAction({ pharmacy, action: 'ACTIVE' })}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setStatusAction({ pharmacy, action: 'REJECTED' })}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {pharmacy.status === 'ACTIVE' && (
                                <DropdownMenuItem
                                  className="text-orange-600"
                                  onClick={() => setStatusAction({ pharmacy, action: 'SUSPENDED' })}
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              {pharmacy.status === 'SUSPENDED' && (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => setStatusAction({ pharmacy, action: 'ACTIVE' })}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Reactivate
                                </DropdownMenuItem>
                              )}
                              {pharmacy.status === 'REJECTED' && (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => setStatusAction({ pharmacy, action: 'ACTIVE' })}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Approve (Override)
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginatedPharmacies.map((pharmacy) => (
              <Card key={pharmacy.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {pharmacy.name?.charAt(0)?.toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{pharmacy.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pharmacy.registration_number || 'No registration #'}
                        </p>
                      </div>
                    </div>
                    <PharmacyStatusBadge status={pharmacy.status} />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {[pharmacy.city, pharmacy.province].filter(Boolean).join(', ') || '—'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailPharmacy(pharmacy)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {isSuperAdmin && pharmacy.status === 'PENDING' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setStatusAction({ pharmacy, action: 'ACTIVE' })}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setStatusAction({ pharmacy, action: 'REJECTED' })}
                          >
                            <XCircle className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({filteredPharmacies.length} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Super Admin Notice */}
      {!isSuperAdmin && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Info className="w-5 h-5 shrink-0" />
              <p>
                Only Super Admins can approve, reject, or suspend pharmacy registrations.
                You can create pharmacies and view their details.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreatePharmacyDialog open={createDialog} onOpenChange={setCreateDialog} />

      <PharmacyDetailDialog
        pharmacy={detailPharmacy}
        open={!!detailPharmacy}
        onOpenChange={(open) => !open && setDetailPharmacy(null)}
      />

      <StatusActionDialog
        pharmacy={statusAction.pharmacy}
        action={statusAction.action}
        open={!!statusAction.pharmacy && !!statusAction.action}
        onOpenChange={(open) => !open && setStatusAction({ pharmacy: null, action: null })}
      />
    </motion.div>
  )
}
