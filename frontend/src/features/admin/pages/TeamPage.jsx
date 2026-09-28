import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Users,
  Shield,
  ShieldCheck,
  Search,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MailPlus,
  Send,
  Ban,
  Calendar,
  Lock,
  Unlock,
  UserCog,
  BadgeCheck,
  BadgeX,
  BadgeAlert,
  Check,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
} from 'lucide-react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDate, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================
// CONSTANTS
// ============================================================

// Roles are dynamic (user-managed via the Roles manager). Badge colors are
// assigned deterministically from the role list order.
const ROLE_COLORS = ['red', 'purple', 'blue', 'green', 'orange', 'yellow', 'teal', 'cyan']

// Roles that are never assignable through the Team UI.
const UNASSIGNABLE_ROLES = ['SUPER_ADMIN', 'PATIENT', 'GUEST']

function prettifyRole(role) {
  if (!role) return role
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function roleColor(role, roles) {
  const idx = (roles || []).findIndex((r) => r.name === role)
  if (idx < 0) return 'secondary'
  return ROLE_COLORS[idx % ROLE_COLORS.length]
}

const VERIFICATION_STATUS = {
  PENDING: { label: 'Pending', color: 'yellow', icon: BadgeAlert },
  VERIFIED: { label: 'Verified', color: 'green', icon: BadgeCheck },
  REJECTED: { label: 'Rejected', color: 'red', icon: BadgeX },
  SUSPENDED: { label: 'Suspended', color: 'orange', icon: BadgeAlert },
  EXPIRED: { label: 'Expired', color: 'red', icon: BadgeAlert },
}

const INVITATION_STATUS = {
  PENDING: 'yellow',
  ACCEPTED: 'green',
  EXPIRED: 'red',
  REVOKED: 'gray',
}

// ============================================================
// BADGES
// ============================================================

function RoleBadge({ role, roles }) {
  if (!role) return null
  const color = roleColor(role, roles)
  return (
    <Badge color={color} className="text-xs font-medium px-3 py-1">
      {prettifyRole(role)}
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
  const config = VERIFICATION_STATUS[status] || { label: status, color: 'gray', icon: BadgeAlert }
  const Icon = config.icon
  return (
    <Badge color={config.color} className="gap-1 text-xs font-medium">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

function InviteBadge({ status }) {
  return (
    <Badge color={INVITATION_STATUS[status] || 'gray'} className="text-xs font-medium">
      {status}
    </Badge>
  )
}

// ============================================================
// INVITE DIALOG
// ============================================================

function InviteStaffDialog({ open, onOpenChange, roles }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ fullName: '', email: '', role: '' })
  const [errors, setErrors] = useState({})

  const assignableRoles = useMemo(
    () => (roles || []).filter((r) => !UNASSIGNABLE_ROLES.includes(r.name)),
    [roles]
  )

  useEffect(() => {
    if (!form.role && assignableRoles.length > 0) {
      setForm((prev) => ({ ...prev, role: assignableRoles[0].name }))
    }
  }, [assignableRoles, form.role])

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
      setForm({ fullName: '', email: '', role: '' })
      setErrors({})
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to create invitation'))
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
            Invite Staff
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
            <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((role) => (
                  <SelectItem key={role.name} value={role.name}>
                    {prettifyRole(role.name)}
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
// CHANGE ROLE DIALOG
// ============================================================

function ChangeRoleDialog({ user, open, onOpenChange, roles }) {
  const queryClient = useQueryClient()
  const [role, setRole] = useState(user?.role || '')

  const assignableRoles = useMemo(
    () => (roles || []).filter((r) => !UNASSIGNABLE_ROLES.includes(r.name)),
    [roles]
  )

  const roleMutation = useMutation({
    mutationFn: ({ id, newRole }) => api.patch(`/auth/users/${id}/role`, { role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Role updated successfully')
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to update role'))
    },
  })

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Change Role
          </DialogTitle>
          <DialogDescription>
            Update role for <span className="font-medium">{user.name || user.email}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{(user.name || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user.name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="ml-auto"><RoleBadge role={user.role} roles={roles} /></div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((r) => (
                  <SelectItem key={r.name} value={r.name}>
                    <div className="flex items-center gap-2">
                      <Badge color={roleColor(r.name, roles)} className="text-[10px] px-2 py-0">
                        {prettifyRole(r.name)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={roleMutation.isPending || user.role === role}
            onClick={() => roleMutation.mutate({ id: user.id || user._id, newRole: role })}
          >
            {roleMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
            ) : (
              'Update Role'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// ROLES MANAGER
// ============================================================

function PermissionToggle({ label, slug, checked, onToggle }) {
  return (
    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-accent/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}

function RoleFormDialog({ open, onOpenChange, role, grouped, submitting, onSubmit }) {
  const isFullAccess = !!(role?.permissions || []).includes('*')
  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: [],
  })

  useEffect(() => {
    setForm({
      name: role?.name || '',
      description: role?.description || '',
      permissions: role ? [...(role.permissions || [])] : [],
    })
  }, [role, open])

  const togglePermission = (slug) => {
    if (isFullAccess) return
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(slug)
        ? prev.permissions.filter((p) => p !== slug)
        : [...prev.permissions, slug],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ name: form.name, description: form.description, permissions: form.permissions })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            {role ? `Edit ${prettifyRole(role.name)}` : 'New Role'}
          </DialogTitle>
          <DialogDescription>
            {role
              ? 'Change the description or the permissions this role grants.'
              : 'Create a role and choose which permissions it grants. You can assign it to team members later.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {!role && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role Name</label>
              <Input
                placeholder="e.g. STORE_MANAGER"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.toUpperCase() }))}
              />
              <p className="text-xs text-muted-foreground">UPPERCASE letters, numbers, or underscores.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="What is this role responsible for?"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Permissions</label>
              <span className="text-xs text-muted-foreground">
                {form.permissions.length} selected
              </span>
            </div>

            {isFullAccess ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                This built-in role has full access. You can edit its description but permissions are fixed.
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {Object.entries(grouped).map(([module, perms]) => (
                  <div key={module} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {module}
                    </p>
                    <div className="space-y-1.5">
                      {perms.map((p) => (
                        <PermissionToggle
                          key={p.slug}
                          label={p.label}
                          slug={p.slug}
                          checked={form.permissions.includes(p.slug)}
                          onToggle={() => togglePermission(p.slug)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || (!role && !form.name.trim())}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" />{role ? 'Save Changes' : 'Create Role'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RolesPermissionsTab({ roles, catalog }) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const grouped = useMemo(() => {
    const map = {}
    for (const p of catalog) {
      if (!map[p.module]) map[p.module] = []
      map[p.module].push(p)
    }
    return map
  }, [catalog])

  const permLabel = useMemo(
    () => Object.fromEntries(catalog.map((p) => [p.slug, p.label])),
    [catalog]
  )

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      payload.isUpdate
        ? api.patch(`/auth/roles/${payload.name}`, {
            description: payload.description,
            permissions: payload.permissions,
          })
        : api.post('/auth/roles', {
            name: payload.name,
            description: payload.description,
            permissions: payload.permissions,
          }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(vars.isUpdate ? 'Role updated' : `Role ${vars.name} created`)
      setCreateOpen(false)
      setEditing(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save role')),
  })

  const deleteMutation = useMutation({
    mutationFn: (name) => api.delete(`/auth/roles/${name}`),
    onSuccess: (_res, name) => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      toast.success(`Role ${name} deleted`)
      setDeleting(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete role')),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-xl">
          Roles control which dashboard, menus, and actions each team member can access.
          Built-in roles cannot be renamed or deleted.
        </p>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          New Role
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 rounded-2xl bg-muted">
            <Shield className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No roles available</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const perms = role.permissions || []
            const hasAll = perms.includes('*')
            const canDelete = !role.isSystem && role.userCount === 0
            return (
              <div key={role.name} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <RoleBadge role={role.name} roles={roles} />
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">Built-in</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {role.description || 'No description'}
                    </p>
                  </div>
                  {hasAll ? (
                    <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {perms.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No permissions</span>
                  ) : hasAll ? (
                    <span className="inline-flex items-center gap-1 text-[11px] rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-green-700 dark:text-green-400">
                      <Check className="w-3 h-3" />
                      Full access
                    </span>
                  ) : (
                    perms.slice(0, 6).map((p) => (
                      <span key={p} className="text-[11px] rounded-full bg-muted px-2 py-1 text-muted-foreground">
                        {permLabel[p] || p}
                      </span>
                    ))
                  )}
                  {perms.length > 6 && !hasAll && (
                    <span className="text-[11px] rounded-full bg-muted px-2 py-1 text-muted-foreground">
                      +{perms.length - 6} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    {role.userCount ?? 0} user{(role.userCount ?? 0) === 1 ? '' : 's'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="Edit role" onClick={() => setEditing(role)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete role"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(role)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <RoleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        role={null}
        grouped={grouped}
        submitting={saveMutation.isPending}
        onSubmit={(payload) => saveMutation.mutate({ ...payload, isUpdate: false })}
      />
      <RoleFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        role={editing}
        grouped={grouped}
        submitting={saveMutation.isPending}
        onSubmit={(payload) => saveMutation.mutate({ ...payload, isUpdate: true })}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Role
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{prettifyRole(deleting?.name)}</span>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleting?.name)}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

const tabClass = 'gap-2'

export default function TeamPage() {
  const queryClient = useQueryClient()
  const { hasAnyPermission } = useAuthStore()
  const canInvite = hasAnyPermission(['team:invite'])
  const canManageTeam = hasAnyPermission(['team:manage'])
  const canManageRoles = hasAnyPermission(['role:manage'])

  const [activeTab, setActiveTab] = useState('members')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [roleTarget, setRoleTarget] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

  const rolesQuery = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/auth/roles').then((r) => r.data),
    staleTime: 60_000,
  })
  const roles = useMemo(() => rolesQuery.data?.data?.roles || [], [rolesQuery.data])
  const catalog = useMemo(() => rolesQuery.data?.data?.catalog || [], [rolesQuery.data])

  const staffRolesParam = useMemo(
    () =>
      rolesQuery.isLoading
        ? 'ADMIN,MANAGER,PHARMACIST,CASHIER,INVENTORY_MANAGER,AUDITOR,SUPER_ADMIN'
        : roles.map((r) => r.name).filter((n) => n !== 'PATIENT' && n !== 'GUEST').join(','),
    [roles, rolesQuery.isLoading]
  )

  const usersQuery = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () =>
      api
        .get('/auth/users', {
          params: {
            page,
            limit: 20,
            role: staffRolesParam,
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        })
        .then((r) => r.data),
    keepPreviousData: true,
  })

  const users = useMemo(() => {
    const raw = usersQuery.data?.data?.users || usersQuery.data?.data || []
    return raw.filter((u) => u.role !== 'PATIENT' && u.role !== 'GUEST')
  }, [usersQuery.data])

  const meta = usersQuery.data?.meta || {}
  const totalPages = Math.max(1, meta.totalPages ?? meta.pages ?? 1)

  const pharmacistIds = useMemo(
    () => users.filter((u) => u.role === 'PHARMACIST').map((u) => u.id || u._id),
    [users]
  )

  const profilesQuery = useQuery({
    queryKey: ['professional-profiles', pharmacistIds],
    queryFn: async () => {
      if (pharmacistIds.length === 0) return {}
      const results = await Promise.allSettled(
        pharmacistIds.map((id) => api.get(`/pharmacies/professional/${id}`).then((r) => [id, r.data?.data]))
      )
      const map = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          const [id, profile] = r.value
          if (profile) map[id] = profile
        }
      })
      return map
    },
    enabled: pharmacistIds.length > 0,
  })
  const profiles = profilesQuery.data || {}

  const invitationsQuery = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: () => api.get('/auth/invitations').then((r) => r.data),
  })
  const invitations = useMemo(
    () => invitationsQuery.data?.data || invitationsQuery.data?.data?.invitations || [],
    [invitationsQuery.data]
  )
  const pendingInvites = invitations.filter((i) => i.status === 'PENDING').length

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
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to resend invitation')),
  })

  const revokeMutation = useMutation({
    mutationFn: (id) => api.patch(`/auth/invitations/${id}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] })
      toast.success('Invitation revoked')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to revoke invitation')),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.patch(`/auth/users/${id}/status`, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Staff member deactivated')
      setDeactivateTarget(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to deactivate staff')),
  })

  const activateMutation = useMutation({
    mutationFn: (id) => api.patch(`/auth/users/${id}/status`, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Staff member activated')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to activate staff')),
  })

  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/auth/users/${id}`),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      toast.success('Staff member removed')
      setRemoveTarget(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to remove staff member')),
  })

  useEffect(() => {
    setPage(1)
  }, [search])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage staff, invitations, roles, and permissions in one place
          </p>
        </div>
        {canInvite && (
          <Button onClick={() => setInviteDialog(true)} className="shrink-0 h-11">
            <MailPlus className="w-4 h-4 mr-2" />
            Invite Staff
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="members" className={tabClass}>
            <Users className="w-4 h-4" />
            Members
          </TabsTrigger>
          {canInvite && (
            <TabsTrigger value="invitations" className={tabClass}>
              <Mail className="w-4 h-4" />
              Invitations
              {pendingInvites > 0 && (
                <Badge color="yellow" className="ml-1.5 text-xs px-2">{pendingInvites}</Badge>
              )}
            </TabsTrigger>
          )}
          {canManageRoles && (
            <TabsTrigger value="permissions" className={tabClass}>
              <Shield className="w-4 h-4" />
              Roles &amp; Permissions
            </TabsTrigger>
          )}
        </TabsList>

        {/* MEMBERS */}
        <TabsContent value="members" className="mt-6 space-y-4">
          <div className="relative max-w-sm">
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

          {usersQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="w-10 h-10 text-destructive" />
              <p className="text-muted-foreground">
                {getApiErrorMessage(usersQuery.error, 'Failed to load staff')}
              </p>
              <Button variant="outline" onClick={() => usersQuery.refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : usersQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-28" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-4 rounded-2xl bg-muted">
                <Users className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                {search ? 'No matching staff' : 'No staff members yet'}
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm text-center">
                {search ? 'Try a different search' : 'Invite your first staff member to get started'}
              </p>
              {!search && canInvite && (
                <Button onClick={() => setInviteDialog(true)} className="mt-2">
                  <MailPlus className="w-4 h-4 mr-2" />
                  Invite Staff
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((member) => {
                      const uid = member.id || member._id
                      const profile = profiles[uid]
                      const isActive = member.active ?? member.isActive
                      return (
                        <TableRow key={uid} className="transition-colors hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-9 h-9">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback>
                                  {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{member.name || 'Unnamed'}</p>
                                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <RoleBadge role={member.role} roles={roles} />
                          </TableCell>
                          <TableCell>
                            {member.role === 'PHARMACIST' ? (
                              <VerificationBadge status={profile?.verification_status || 'PENDING'} />
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <AccountStatusBadge active={isActive} />
                          </TableCell>
                          <TableCell>
                            {canManageTeam ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Change role"
                                  onClick={() => setRoleTarget(member)}
                                >
                                  <UserCog className="w-4 h-4" />
                                </Button>
                                {isActive ? (
<Button
                                  variant="ghost"
                                  size="icon"
                                  title="Deactivate"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeactivateTarget(member)}
                                >
                                  <Lock className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Activate"
                                  className="text-green-600 hover:text-green-600"
                                  disabled={activateMutation.isPending}
                                  onClick={() => activateMutation.mutate(uid)}
                                >
                                  <Unlock className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Remove user"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setRemoveTarget(member)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || usersQuery.isFetching}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || usersQuery.isFetching}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next<ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* INVITATIONS */}
        <TabsContent value="invitations" className="mt-6">
          {invitationsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-4 rounded-2xl bg-muted">
                <Mail className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No invitations yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm text-center">
                Invite a staff member and they will receive a link to set up their own account
              </p>
              <Button onClick={() => setInviteDialog(true)} className="mt-2">
                <MailPlus className="w-4 h-4 mr-2" />
                Invite Staff
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                        <span className="text-sm font-medium">{inv.email}</span>
                        {inv.full_name && (
                          <p className="text-xs text-muted-foreground">{inv.full_name}</p>
                        )}
                      </TableCell>
                      <TableCell>
                            <RoleBadge role={inv.role} roles={roles} />
                          </TableCell>
                      <TableCell>
                        <InviteBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {inv.expires_at ? formatDate(inv.expires_at) : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {(inv.status === 'PENDING' || inv.status === 'EXPIRED') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={resendMutation.isPending}
                              onClick={() => resendMutation.mutate(inv.id)}
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1" />
                              Resend
                            </Button>
                          )}
                          {inv.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={revokeMutation.isPending}
                              onClick={() => revokeMutation.mutate(inv.id)}
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ROLES & PERMISSIONS */}
        {canManageRoles && (
          <TabsContent value="permissions" className="mt-6">
            <RolesPermissionsTab roles={roles} catalog={catalog} />
          </TabsContent>
        )}
      </Tabs>

      <InviteStaffDialog open={inviteDialog} onOpenChange={setInviteDialog} roles={roles} />
      <ChangeRoleDialog
        user={roleTarget}
        open={!!roleTarget}
        onOpenChange={(open) => !open && setRoleTarget(null)}
        roles={roles}
      />

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-destructive" />
              Deactivate Staff Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium text-foreground">
                {deactivateTarget?.name || deactivateTarget?.email}
              </span>
              ? They will no longer be able to log in until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deactivateMutation.mutate(deactivateTarget?.id || deactivateTarget?._id)}
            >
              {deactivateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Remove Staff Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              Permanently remove{' '}
              <span className="font-medium text-foreground">
                {removeTarget?.name || removeTarget?.email}
              </span>{' '}
              and delete their account from the system? This cannot be undone. If they have sales,
              prescriptions, stock movements, or other recorded activity, the system will refuse and
              you should deactivate them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeMutation.mutate(removeTarget?.id || removeTarget?._id)}
            >
              {removeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}