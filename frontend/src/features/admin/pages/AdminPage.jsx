import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldOff,
  Plus,
  X,
  Search,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserPlus,
  UserCog,
  Mail,
  Calendar,
  Check,
  Lock,
  Unlock,
  MoreHorizontal,
} from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
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
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

const ROLES = [
  { id: 'ADMIN', label: 'Admin', color: 'red' },
  { id: 'PHARMACIST', label: 'Pharmacist', color: 'blue' },
  { id: 'CASHIER', label: 'Cashier', color: 'green' },
  { id: 'INVENTORY_MANAGER', label: 'Inventory Manager', color: 'purple' },
  { id: 'AUDITOR', label: 'Auditor', color: 'orange' },
]

const PERMISSIONS = [
  { id: 'medicine:create', label: 'Create Medicine', feature: 'Medicine' },
  { id: 'medicine:edit', label: 'Edit Medicine', feature: 'Medicine' },
  { id: 'medicine:delete', label: 'Delete Medicine', feature: 'Medicine' },
  { id: 'medicine:view', label: 'View Medicine', feature: 'Medicine' },
  { id: 'sale:create', label: 'Create Sale', feature: 'Sales' },
  { id: 'sale:edit', label: 'Edit Sale', feature: 'Sales' },
  { id: 'sale:delete', label: 'Delete Sale', feature: 'Sales' },
  { id: 'sale:void', label: 'Void Sale', feature: 'Sales' },
  { id: 'sale:view', label: 'View Sale', feature: 'Sales' },
  { id: 'prescription:create', label: 'Create Prescription', feature: 'Prescription' },
  { id: 'prescription:edit', label: 'Edit Prescription', feature: 'Prescription' },
  { id: 'prescription:approve', label: 'Approve Prescription', feature: 'Prescription' },
  { id: 'prescription:delete', label: 'Delete Prescription', feature: 'Prescription' },
  { id: 'inventory:manage', label: 'Manage Inventory', feature: 'Inventory' },
  { id: 'inventory:adjust', label: 'Adjust Stock', feature: 'Inventory' },
  { id: 'user:manage', label: 'Manage Users', feature: 'Administration' },
  { id: 'user:view', label: 'View Users', feature: 'Administration' },
  { id: 'audit:view', label: 'View Audit Logs', feature: 'Administration' },
  { id: 'reports:view', label: 'View Reports', feature: 'Reports' },
  { id: 'reports:export', label: 'Export Reports', feature: 'Reports' },
  { id: 'settings:manage', label: 'Manage Settings', feature: 'Administration' },
]

const PERMISSION_MATRIX = {
  ADMIN: [
    'medicine:create', 'medicine:edit', 'medicine:delete', 'medicine:view',
    'sale:create', 'sale:edit', 'sale:delete', 'sale:void', 'sale:view',
    'prescription:create', 'prescription:edit', 'prescription:approve', 'prescription:delete',
    'inventory:manage', 'inventory:adjust',
    'user:manage', 'user:view', 'audit:view',
    'reports:view', 'reports:export', 'settings:manage',
  ],
  PHARMACIST: [
    'medicine:create', 'medicine:edit', 'medicine:view',
    'sale:create', 'sale:edit', 'sale:view',
    'prescription:create', 'prescription:edit', 'prescription:approve',
    'inventory:manage',
    'user:view',
    'reports:view',
  ],
  CASHIER: [
    'medicine:view',
    'sale:create', 'sale:edit', 'sale:view',
    'inventory:manage',
  ],
  INVENTORY_MANAGER: [
    'medicine:create', 'medicine:edit', 'medicine:view',
    'inventory:manage', 'inventory:adjust',
    'sale:view',
    'reports:view',
  ],
  AUDITOR: [
    'medicine:view',
    'sale:view',
    'audit:view',
    'reports:view', 'reports:export',
    'user:view',
  ],
}

const ITEMS_PER_PAGE = 10

function RoleBadge({ role }) {
  const roleConfig = ROLES.find((r) => r.id === role)
  if (!roleConfig) return <Badge variant="secondary">{role}</Badge>
  return (
    <Badge color={roleConfig.color} className="text-xs font-medium px-3 py-1">
      {roleConfig.label}
    </Badge>
  )
}

function StatusBadge({ active }) {
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

function AddUserDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CASHIER' })
  const [errors, setErrors] = useState({})

  const addUserMutation = useMutation({
    mutationFn: (data) => api.post('/auth/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User added successfully')
      onOpenChange(false)
      setForm({ name: '', email: '', password: '', role: 'CASHIER' })
      setErrors({})
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to add user'
      toast.error(msg)
      if (err.response?.data?.errors) {
        const fieldErrors = {}
        err.response.data.errors.forEach((e) => {
          fieldErrors[e.field] = e.message
        })
        setErrors(fieldErrors)
      }
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.email.trim()) newErrors.email = 'Email is required'
    if (!form.password) newErrors.password = 'Password is required'
    if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    addUserMutation.mutate(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account with role-based access
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="john@pharmacy.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
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
                {ROLES.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addUserMutation.isPending}>
              {addUserMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" />Add User</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RoleChangeDialog({ user, open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [selectedRole, setSelectedRole] = useState(user?.role || '')

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/auth/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User role updated successfully')
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update role')
    },
  })

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Change User Role
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
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New Role</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <Badge color={role.color} className="text-[10px] px-2 py-0">{role.label}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {user.role && user.role !== selectedRole && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Changing from <strong>{ROLES.find((r) => r.id === user.role)?.label || user.role}</strong> to{' '}
                <strong>{ROLES.find((r) => r.id === selectedRole)?.label || selectedRole}</strong>
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={roleMutation.isPending || user.role === selectedRole}
            onClick={() => roleMutation.mutate({ id: user.id || user._id, role: selectedRole })}
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

function UsersTab({ users, isLoading, search, onSearchChange, addDialog, setAddDialog }) {
  const [page, setPage] = useState(1)
  const [roleDialog, setRoleDialog] = useState(null)
  const queryClient = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/auth/users/${id}/status`, { isActive }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(variables.isActive ? 'User activated' : 'User deactivated')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update user status')
    },
  })

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="p-4 rounded-2xl bg-muted">
          <Users className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          {search ? 'No users found' : 'No users registered'}
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          {search
            ? 'Try a different search term'
            : 'Add your first user to get started with the system'}
        </p>
        {!search && (
          <Button onClick={() => setAddDialog(true)} className="mt-2">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => {
                const uid = user.id || user._id
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
                        <div>
                          <p className="text-sm font-medium">{user.name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge active={user.active ?? user.isActive} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {user.lastActive || user.lastLogin
                          ? formatDate(user.lastActive || user.lastLogin)
                          : 'Never'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRoleDialog(user)}
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Change role</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={statusMutation.isPending}
                                onClick={() => {
                                  const isActive = user.active ?? user.isActive
                                  statusMutation.mutate({ id: uid, isActive: !isActive })
                                }}
                              >
                                {(user.active ?? user.isActive) ? (
                                  <Unlock className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {(user.active ?? user.isActive) ? 'Deactivate' : 'Activate'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-3">
          {paginatedUsers.map((user) => {
            const uid = user.id || user._id
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
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-3">
                      <StatusBadge active={user.active ?? user.isActive} />
                      <span className="text-xs text-muted-foreground">
                        {user.lastActive ? formatDate(user.lastActive) : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRoleDialog(user)}>
                        <Shield className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({filteredUsers.length} total)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddUserDialog open={addDialog} onOpenChange={setAddDialog} />
      <RoleChangeDialog
        user={roleDialog}
        open={!!roleDialog}
        onOpenChange={(open) => !open && setRoleDialog(null)}
      />
    </>
  )
}

function PermissionsTab() {
  const features = [...new Set(PERMISSIONS.map((p) => p.feature))]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Permissions Matrix
          </CardTitle>
          <CardDescription>
            Role-based access control matrix — permissions are managed on the backend.
            This view shows the current configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 min-w-[200px] sticky left-0 bg-muted/30 z-10">
                  Permission
                </th>
                {ROLES.map((role) => (
                  <th key={role.id} className="text-center px-3 py-3 min-w-[130px]">
                    <Badge color={role.color} className="text-[10px] px-2 py-0.5 whitespace-nowrap">
                      {role.label}
                    </Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {features.map((feature) => (
                <>
                  <tr key={feature} className="bg-muted/20">
                    <td
                      colSpan={ROLES.length + 1}
                      className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {feature}
                    </td>
                  </tr>
                  {PERMISSIONS.filter((p) => p.feature === feature).map((perm) => (
                    <tr key={perm.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">
                        {perm.label}
                      </td>
                      {ROLES.map((role) => {
                        const allowed = PERMISSION_MATRIX[role.id]?.includes(perm.id) || false
                        return (
                          <td key={role.id} className="text-center px-3 py-3">
                            <div className="flex items-center justify-center">
                              {allowed ? (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-medium hidden lg:inline">Allowed</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground">
                                  <ShieldOff className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-medium hidden lg:inline">Denied</span>
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="w-5 h-5" />
            <p>
              Permissions are defined and enforced on the backend. This matrix is read-only
              and reflects the current RBAC configuration. Contact an administrator to make changes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminPage() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('users')
  const [addDialog, setAddDialog] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/auth/users').then((r) => r.data),
  })

  const users = data?.data?.users || data?.data || []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and permissions
          </p>
        </div>
        {activeTab === 'users' && (
          <Button onClick={() => setAddDialog(true)} className="shrink-0 h-11">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6 space-y-4">
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
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="w-10 h-10 text-destructive" />
              <p className="text-muted-foreground">
                {error.response?.data?.message || 'Failed to load users'}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <UsersTab
              users={users}
              isLoading={isLoading}
              search={search}
              onSearchChange={setSearch}
              addDialog={addDialog}
              setAddDialog={setAddDialog}
            />
          )}
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionsTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
