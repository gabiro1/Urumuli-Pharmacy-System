import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldOff,
  Search,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserPlus,
  Mail,
  MailPlus,
  Send,
  Ban,
  Calendar,
  Check,
  Lock,
  Unlock,
  MoreHorizontal,
  BadgeCheck,
  BadgeX,
  BadgeAlert,
  Clock,
  FileCheck,
  UserX,
  UserCog,
  Eye,
  Pill,
} from 'lucide-react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

const STAFF_ROLES = [
  { id: 'ADMIN', label: 'Admin', color: 'red' },
  { id: 'MANAGER', label: 'Manager', color: 'purple' },
  { id: 'PHARMACIST', label: 'Pharmacist', color: 'blue' },
  { id: 'CASHIER', label: 'Cashier', color: 'green' },
  { id: 'INVENTORY_MANAGER', label: 'Inventory Manager', color: 'purple' },
  { id: 'AUDITOR', label: 'Auditor', color: 'orange' },
]

const VERIFICATION_STATUS = {
  PENDING: { label: 'Pending', color: 'yellow', icon: Clock },
  VERIFIED: { label: 'Verified', color: 'green', icon: BadgeCheck },
  REJECTED: { label: 'Rejected', color: 'red', icon: BadgeX },
  SUSPENDED: { label: 'Suspended', color: 'orange', icon: BadgeAlert },
  EXPIRED: { label: 'Expired', color: 'red', icon: BadgeAlert },
}

const LICENSE_STATUS = {
  ACTIVE: { label: 'Active', color: 'green' },
  EXPIRED: { label: 'Expired', color: 'red' },
  PENDING: { label: 'Pending', color: 'yellow' },
}

const INVITE_ROLES = [
  { id: 'PHARMACIST', label: 'Pharmacist' },
  { id: 'CASHIER', label: 'Cashier' },
  { id: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
  { id: 'MANAGER', label: 'Manager' },
  { id: 'AUDITOR', label: 'Auditor' },
]

const ITEMS_PER_PAGE = 10

// ============================================================
// BADGE COMPONENTS
// ============================================================

function RoleBadge({ role }) {
  const roleConfig = STAFF_ROLES.find((r) => r.id === role)
  if (!roleConfig) return <Badge variant="secondary">{role}</Badge>
  return (
    <Badge color={roleConfig.color} className="text-xs font-medium px-3 py-1">
      {roleConfig.label}
    </Badge>
  )
}

function AccountStatusBadge({ active }) {
  if (active === undefined) return null
  return active ? (
    <Badge color="green" className="gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Active
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
      Inactive
    </Badge>
  )
}

function VerificationBadge({ status }) {
  if (!status) return <span className="text-xs text-muted-foreground">N/A</span>
  const config = VERIFICATION_STATUS[status] || { label: status, color: 'gray', icon: Clock }
  const Icon = config.icon
  return (
    <Badge color={config.color} className="gap-1 text-xs font-medium">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

function LicenseBadge({ status, expiryDate }) {
  if (!status && !expiryDate) return <span className="text-xs text-muted-foreground">N/A</span>

  let effectiveStatus = status
  if (!effectiveStatus && expiryDate) {
    effectiveStatus = new Date(expiryDate) > new Date() ? 'ACTIVE' : 'EXPIRED'
  }

  const config = LICENSE_STATUS[effectiveStatus] || { label: effectiveStatus || 'Unknown', color: 'gray' }
  return (
    <div className="flex flex-col gap-0.5">
      <Badge color={config.color} className="text-xs font-medium w-fit">
        {config.label}
      </Badge>
      {expiryDate && (
        <span className="text-[10px] text-muted-foreground">
          Exp: {formatDate(expiryDate)}
        </span>
      )}
    </div>
  )
}

// ============================================================
// INVITE DIALOG
// ============================================================

function InviteStaffDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ fullName: '', email: '', role: 'PHARMACIST' })
  const [errors, setErrors] = useState({})

  const inviteMutation = useMutation({
    mutationFn: (data) => api.post('/auth/invitations', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] })
      const inviteUrl = response?.data?.data?.inviteUrl
      if (inviteUrl) {
        toast.success('Invitation created — link copied to clipboard')
        navigator.clipboard?.writeText(inviteUrl).catch(() => {})
      } else {
        toast.success('Invitation created successfully')
      }
      onOpenChange(false)
      setForm({ fullName: '', email: '', role: 'PHARMACIST' })
      setErrors({})
    },
    onError: (err) => {
      const msg = getApiErrorMessage(err, 'Failed to create invitation')
      toast.error(msg)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!form.email.trim()) newErrors.email = 'Email is required'
    if (!form.role) newErrors.role = 'Role is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    inviteMutation.mutate({
      email: form.email,
      role: form.role,
      fullName: form.fullName.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailPlus className="w-5 h-5" />
            Invite Staff Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation link. The invitee will set their own password when they accept.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name (optional)</label>
            <Input
              placeholder="e.g. Jane Smith"
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="jane@pharmacy.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITE_ROLES.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Send Invitation</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// DETAIL / VIEW DIALOG
// ============================================================

function StaffDetailDialog({ user, profile, open, onOpenChange }) {
  if (!user) return null

  const hasProfile = !!profile

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Staff Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <Avatar className="w-14 h-14">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-lg">
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold truncate">{user.name || 'Unnamed'}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
              {user.phone && (
                <p className="text-sm text-muted-foreground">{user.phone}</p>
              )}
            </div>
            <RoleBadge role={user.role} />
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</p>
              <AccountStatusBadge active={user.active ?? user.isActive} />
            </div>
            <div className="p-3 rounded-lg border space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</p>
              <RoleBadge role={user.role} />
            </div>
            {hasProfile ? (
              <>
                <div className="p-3 rounded-lg border space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Verification</p>
                  <VerificationBadge status={profile.verification_status} />
                </div>
                <div className="p-3 rounded-lg border space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">License</p>
                  <LicenseBadge
                    status={profile.license_expiry ? (new Date(profile.license_expiry) > new Date() ? 'ACTIVE' : 'EXPIRED') : 'PENDING'}
                    expiryDate={profile.license_expiry}
                  />
                </div>
              </>
            ) : (
              <div className="col-span-2 p-3 rounded-lg border space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Professional Profile</p>
                <p className="text-sm text-muted-foreground">
                  {user.role === 'PHARMACIST'
                    ? 'No professional profile submitted yet'
                    : 'Not applicable for this role'}
                </p>
              </div>
            )}
          </div>

          {/* Professional Details */}
          {hasProfile && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Professional Credentials</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {profile.professional_registration_number && (
                  <div>
                    <p className="text-muted-foreground text-xs">Registration #</p>
                    <p className="font-medium">{profile.professional_registration_number}</p>
                  </div>
                )}
                {profile.license_number && (
                  <div>
                    <p className="text-muted-foreground text-xs">License #</p>
                    <p className="font-medium">{profile.license_number}</p>
                  </div>
                )}
                {profile.qualification && (
                  <div>
                    <p className="text-muted-foreground text-xs">Qualification</p>
                    <p className="font-medium">{profile.qualification}</p>
                  </div>
                )}
                {profile.specialization && (
                  <div>
                    <p className="text-muted-foreground text-xs">Specialization</p>
                    <p className="font-medium">{profile.specialization}</p>
                  </div>
                )}
                {profile.license_issuing_authority && (
                  <div>
                    <p className="text-muted-foreground text-xs">Issuing Authority</p>
                    <p className="font-medium">{profile.license_issuing_authority}</p>
                  </div>
                )}
                {profile.years_of_experience != null && (
                  <div>
                    <p className="text-muted-foreground text-xs">Experience</p>
                    <p className="font-medium">{profile.years_of_experience} years</p>
                  </div>
                )}
              </div>
              {profile.verification_notes && (
                <div className="mt-2">
                  <p className="text-muted-foreground text-xs">Verification Notes</p>
                  <p className="text-sm mt-0.5">{profile.verification_notes}</p>
                </div>
              )}
              {profile.rejection_reason && (
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <p className="text-xs font-medium text-destructive">Rejection Reason</p>
                  <p className="text-sm mt-0.5">{profile.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          {/* Meta Info */}
          <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t">
            <p>Joined: {user.createdAt ? formatDate(user.createdAt) : '—'}</p>
            <p>Last active: {user.lastLoginAt || user.lastActive ? formatDate(user.lastLoginAt || user.lastActive) : 'Never'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// MAIN STAFF MANAGEMENT PAGE
// ============================================================

export default function StaffManagementPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [detailUser, setDetailUser] = useState(null)
  const [detailProfile, setDetailProfile] = useState(null)
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [activeTab, setActiveTab] = useState('staff')
  const queryClient = useQueryClient()

  // Fetch users
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErr,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/auth/users').then((r) => r.data),
  })

  const users = useMemo(() => {
    const raw = usersData?.data?.users || usersData?.data || []
    // Filter out PATIENT and GUEST roles — this page is staff-only
    return raw.filter((u) => u.role !== 'PATIENT' && u.role !== 'GUEST')
  }, [usersData])

  // Fetch professional profiles for pharmacist users
  const pharmacistIds = useMemo(
    () => users.filter((u) => u.role === 'PHARMACIST').map((u) => u.id || u._id),
    [users]
  )

  const { data: profilesData } = useQuery({
    queryKey: ['professional-profiles', pharmacistIds],
    queryFn: async () => {
      if (pharmacistIds.length === 0) return {}
      const results = await Promise.allSettled(
        pharmacistIds.map((id) =>
          api.get(`/pharmacies/professional/${id}`).then((r) => [id, r.data?.data])
        )
      )
      const map = {}
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [id, profile] = result.value
          if (profile) map[id] = profile
        }
      })
      return map
    },
    enabled: pharmacistIds.length > 0,
  })

  const profiles = profilesData || {}

  // Fetch invitations
  const {
    data: invitationsData,
    isLoading: invitationsLoading,
    refetch: refetchInvitations,
  } = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: () => api.get('/auth/invitations').then((r) => r.data),
  })

  const invitations = useMemo(() => {
    return invitationsData?.data || invitationsData?.data?.invitations || []
  }, [invitationsData])

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: (id) => api.post(`/auth/invitations/${id}/resend`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] })
      const inviteUrl = response?.data?.data?.inviteUrl
      if (inviteUrl) {
        toast.success('Invitation resent — link copied to clipboard')
        navigator.clipboard?.writeText(inviteUrl).catch(() => {})
      } else {
        toast.success('Invitation resent successfully')
      }
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to resend invitation'))
    },
  })

  // Revoke invitation mutation
  const revokeMutation = useMutation({
    mutationFn: (id) => api.patch(`/auth/invitations/${id}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] })
      toast.success('Invitation revoked')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to revoke invitation'))
    },
  })

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/auth/users/${id}/status`, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Staff member suspended')
      setSuspendTarget(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to suspend staff'))
    },
  })

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: (id) => api.patch(`/auth/users/${id}/status`, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Staff member activated')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to activate staff'))
    },
  })

  // Filter and search
  const filteredUsers = useMemo(() => {
    let result = users

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.fullName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.role || '').toLowerCase().includes(q)
      )
    }

    if (roleFilter !== 'ALL') {
      result = result.filter((u) => u.role === roleFilter)
    }

    if (statusFilter !== 'ALL') {
      const isActive = statusFilter === 'ACTIVE'
      result = result.filter((u) => (u.active ?? u.isActive) === isActive)
    }

    return result
  }, [users, search, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  // Summary stats
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.active ?? u.isActive).length
    const pharmacists = users.filter((u) => u.role === 'PHARMACIST').length
    const verifiedPharmacists = Object.values(profiles).filter(
      (p) => p.verification_status === 'VERIFIED'
    ).length
    return { total, active, pharmacists, verifiedPharmacists }
  }, [users, profiles])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statusFilter])

  // Open detail dialog with profile data
  const handleViewDetail = (user) => {
    const uid = user.id || user._id
    setDetailUser(user)
    setDetailProfile(profiles[uid] || null)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage pharmacy staff, roles, verification, and access
          </p>
        </div>
        <Button onClick={() => setInviteDialog(true)} className="shrink-0 h-11">
          <MailPlus className="w-4 h-4 mr-2" />
          Invite Staff
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BadgeCheck className="w-5 h-5 text-green-600" />
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
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Pill className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pharmacists}</p>
                <p className="text-xs text-muted-foreground">Pharmacists</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <FileCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.verifiedPharmacists}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
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
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <span className="sr-only">Clear search</span>
              &times;
            </button>
          )}
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            {STAFF_ROLES.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-10">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            {invitations.filter((i) => i.status === 'PENDING').length > 0 && (
              <Badge color="yellow" className="ml-2 text-xs">
                {invitations.filter((i) => i.status === 'PENDING').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
      {/* Staff Table */}
      {usersError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <p className="text-muted-foreground">
            {getApiErrorMessage(usersErr, 'Failed to load staff')}
          </p>
          <Button variant="outline" onClick={() => refetchUsers()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : usersLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 rounded-2xl bg-muted">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            {search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No staff members match your filters'
              : 'No staff members yet'}
          </h3>
          <p className="text-muted-foreground text-sm max-w-sm text-center">
            {search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filters'
              : 'Invite your first staff member to get started'}
          </p>
          {!search && roleFilter === 'ALL' && statusFilter === 'ALL' && (
            <Button onClick={() => setInviteDialog(true)} className="mt-2">
              <MailPlus className="w-4 h-4 mr-2" />
              Invite Staff
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
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                  const uid = user.id || user._id
                  const profile = profiles[uid]
                  const isActive = user.active ?? user.isActive

                  return (
                    <TableRow key={uid} className="transition-colors hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{user.name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 shrink-0" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell>
                        {user.role === 'PHARMACIST' ? (
                          <VerificationBadge status={profile?.verification_status || 'PENDING'} />
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'PHARMACIST' ? (
                          <LicenseBadge
                            status={profile?.license_expiry ? (new Date(profile.license_expiry) > new Date() ? 'ACTIVE' : 'EXPIRED') : 'PENDING'}
                            expiryDate={profile?.license_expiry}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <AccountStatusBadge active={isActive} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewDetail(user)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View details</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(user)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isActive ? (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setSuspendTarget(user)}
                                >
                                  <Lock className="w-4 h-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => activateMutation.mutate(uid)}
                                >
                                  <Unlock className="w-4 h-4 mr-2" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginatedUsers.map((user) => {
              const uid = user.id || user._id
              const profile = profiles[uid]
              const isActive = user.active ?? user.isActive

              return (
                <Card key={uid}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t text-xs">
                      <div>
                        <span className="text-muted-foreground">Verification: </span>
                        {user.role === 'PHARMACIST' ? (
                          <VerificationBadge status={profile?.verification_status || 'PENDING'} />
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status: </span>
                        <AccountStatusBadge active={isActive} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        {user.lastLoginAt || user.lastActive
                          ? formatDate(user.lastLoginAt || user.lastActive)
                          : 'Never active'}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetail(user)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {isActive ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSuspendTarget(user)}
                          >
                            <Lock className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => activateMutation.mutate(uid)}
                          >
                            <Unlock className="w-3.5 h-3.5 text-green-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({filteredUsers.length} total)
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
        </TabsContent>

        <TabsContent value="invitations">
          {invitationsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-4 rounded-2xl bg-muted">
                <Mail className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No invitations yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm text-center">
                Send your first staff invitation to get started
              </p>
              <Button onClick={() => setInviteDialog(true)} className="mt-2">
                <MailPlus className="w-4 h-4 mr-2" />
                Invite Staff
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{inv.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={inv.role} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            color={
                              inv.status === 'PENDING'
                                ? 'yellow'
                                : inv.status === 'ACCEPTED'
                                  ? 'green'
                                  : inv.status === 'EXPIRED'
                                    ? 'red'
                                    : 'gray'
                            }
                            className="text-xs"
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {inv.expires_at ? formatDate(inv.expires_at) : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {inv.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resendMutation.mutate(inv.id)}
                                  disabled={resendMutation.isPending}
                                >
                                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                  Resend
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => revokeMutation.mutate(inv.id)}
                                  disabled={revokeMutation.isPending}
                                >
                                  <Ban className="w-3.5 h-3.5 mr-1" />
                                  Revoke
                                </Button>
                              </>
                            )}
                            {inv.status === 'EXPIRED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendMutation.mutate(inv.id)}
                                disabled={resendMutation.isPending}
                              >
                                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                Resend
                              </Button>
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
                {invitations.map((inv) => (
                  <Card key={inv.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">{inv.full_name || 'No name provided'}</p>
                        </div>
                        <RoleBadge role={inv.role} />
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Badge
                            color={
                              inv.status === 'PENDING'
                                ? 'yellow'
                                : inv.status === 'ACCEPTED'
                                  ? 'green'
                                  : 'red'
                            }
                            className="text-xs"
                          >
                            {inv.status}
                          </Badge>
                          {inv.expires_at && (
                            <span className="text-xs text-muted-foreground">
                              Exp: {formatDate(inv.expires_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {inv.status === 'PENDING' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => resendMutation.mutate(inv.id)}
                                disabled={resendMutation.isPending}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => revokeMutation.mutate(inv.id)}
                                disabled={revokeMutation.isPending}
                              >
                                <Ban className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </>
                          )}
                          {inv.status === 'EXPIRED' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => resendMutation.mutate(inv.id)}
                              disabled={resendMutation.isPending}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteStaffDialog open={inviteDialog} onOpenChange={setInviteDialog} />

      <StaffDetailDialog
        user={detailUser}
        profile={detailProfile}
        open={!!detailUser}
        onOpenChange={(open) => {
          if (!open) {
            setDetailUser(null)
            setDetailProfile(null)
          }
        }}
      />

      {/* Suspend Confirmation */}
      <AlertDialog open={!!suspendTarget} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-destructive" />
              Deactivate Staff Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium text-foreground">
                {suspendTarget?.name || suspendTarget?.email}
              </span>
              ? They will no longer be able to log in until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (suspendTarget) {
                  const uid = suspendTarget.id || suspendTarget._id
                  suspendMutation.mutate({ id: uid })
                }
              }}
            >
              {suspendMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
