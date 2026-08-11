import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Download,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  Clock,
  Monitor,
  User,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

const ITEMS_PER_PAGE = 15

const ENTITY_TYPES = [
  { value: 'all', label: 'All Entities' },
  { value: 'USER', label: 'User' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'SALE', label: 'Sale' },
  { value: 'PRESCRIPTION', label: 'Prescription' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'SETTINGS', label: 'Settings' },
]

const ACTION_TYPES = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Create', icon: Plus, color: 'green' },
  { value: 'UPDATE', label: 'Update', icon: Pencil, color: 'blue' },
  { value: 'DELETE', label: 'Delete', icon: Trash2, color: 'red' },
  { value: 'LOGIN', label: 'Login', icon: LogIn, color: 'green' },
  { value: 'LOGOUT', label: 'Logout', icon: LogOut, color: 'gray' },
]

const ACTION_CONFIG = {
  CREATE: { icon: Plus, color: 'green', label: 'Create' },
  UPDATE: { icon: Pencil, color: 'blue', label: 'Update' },
  DELETE: { icon: Trash2, color: 'red', label: 'Delete' },
  LOGIN: { icon: LogIn, color: 'green', label: 'Login' },
  LOGOUT: { icon: LogOut, color: 'gray', label: 'Logout' },
}

function ActionBadge({ action }) {
  const config = ACTION_CONFIG[action] || { icon: FileText, color: 'default', label: action }
  const Icon = config.icon
  return (
    <Badge color={config.color === 'gray' ? 'default' : config.color} className="gap-1.5 px-3 py-1 text-xs font-medium">
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  )
}

function SecurityBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <ShieldAlert className="w-4 h-4 text-amber-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Security-related event</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function DetailModal({ entry, open, onOpenChange }) {
  if (!entry) return null

  const changes = entry.changes || entry.details?.changes || []
  const hasChanges = changes.length > 0
  const isSecurity = entry.action === 'LOGIN' || entry.action === 'LOGOUT' || entry.action === 'DELETE'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ActionBadge action={entry.action} />
            <div>
              <DialogTitle className="flex items-center gap-2">
                Audit Entry Details
                {isSecurity && <SecurityBadge />}
              </DialogTitle>
              <DialogDescription>
                {entry.entityType} #{entry.entityId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">User</p>
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={entry.user?.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {(entry.user?.name || entry.user?.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{entry.user?.name || entry.user?.email || 'Unknown'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Timestamp</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {formatDate(entry.createdAt || entry.timestamp)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Entity</p>
                <Badge variant="secondary" className="text-xs">
                  {entry.entityType}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Entity ID</p>
                <span className="text-sm font-mono">{entry.entityId}</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">IP Address</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs">{entry.ipAddress || entry.ip || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">User Agent</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="text-left">
                      <span className="text-xs text-muted-foreground truncate block max-w-[200px]">
                        {entry.userAgent || entry.user_agent || 'N/A'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs break-words">{entry.userAgent || entry.user_agent}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {entry.description && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-sm p-3 rounded-lg bg-muted/50">{entry.description}</p>
              </div>
            )}

            {isSecurity && (
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Security Event</span>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  {entry.action === 'LOGIN' && 'User logged into the system'}
                  {entry.action === 'LOGOUT' && 'User logged out of the system'}
                  {entry.action === 'DELETE' && 'An entity was deleted from the system'}
                </p>
              </div>
            )}

            {hasChanges && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Changed Fields</span>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[30%]">Field</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[35%]">Old Value</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[35%]">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {changes.map((change, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-xs">{change.field || change.fieldName}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">
                              {change.oldValue ?? change.old ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-mono text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded">
                              {change.newValue ?? change.new ?? '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [filters, setFilters] = useState({
    entity: 'all',
    action: 'all',
    userId: 'all',
    dateFrom: '',
    dateTo: '',
  })

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filters.entity !== 'all') params.set('entity', filters.entity)
    if (filters.action !== 'all') params.set('action', filters.action)
    if (filters.userId !== 'all') params.set('userId', filters.userId)
    if (filters.dateFrom) params.set('fromDate', filters.dateFrom)
    if (filters.dateTo) params.set('toDate', filters.dateTo)
    params.set('page', String(page))
    params.set('limit', String(ITEMS_PER_PAGE))
    return params.toString()
  }, [search, filters, page])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => api.get(`/audit?${queryParams}`).then((r) => r.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['audit-users'],
    queryFn: () => api.get('/auth/users').then((r) => r.data),
    enabled: showFilters,
  })

  const logs = data?.data?.logs || data?.data || []
  const totalPages = data?.data?.pagination?.totalPages || data?.meta?.totalPages || 1
  const totalItems = data?.data?.pagination?.total || data?.meta?.total || 0
  const users = usersData?.data?.users || usersData?.data || []

  const hasActiveFilters =
    filters.entity !== 'all' ||
    filters.action !== 'all' ||
    filters.userId !== 'all' ||
    filters.dateFrom ||
    filters.dateTo

  const clearAllFilters = () => {
    setFilters({ entity: 'all', action: 'all', userId: 'all', dateFrom: '', dateTo: '' })
    setSearch('')
    setPage(1)
  }

  const handleExport = () => {
    toast.promise(
      api.get(`/audit/export?${queryParams}`, { responseType: 'blob' }),
      {
        loading: 'Exporting audit logs...',
        success: (res) => {
          const url = window.URL.createObjectURL(new Blob([res.data]))
          const a = document.createElement('a')
          a.href = url
          a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
          a.click()
          window.URL.revokeObjectURL(url)
          return 'Audit logs exported successfully'
        },
        error: 'Failed to export audit logs',
      }
    )
  }

  const getUserInitials = (entry) => {
    const name = entry.user?.name || entry.user?.email || 'U'
    return name.charAt(0).toUpperCase()
  }

  const formatTimestamp = (entry) => {
    const date = entry.createdAt || entry.timestamp
    if (!date) return '—'
    return formatDate(date)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} className="h-11">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={handleExport} className="shrink-0 h-11">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by description, entity ID, or user..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
                    <Select
                      value={filters.entity}
                      onValueChange={(v) => { setFilters((p) => ({ ...p, entity: v })); setPage(1) }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Action</label>
                    <Select
                      value={filters.action}
                      onValueChange={(v) => { setFilters((p) => ({ ...p, action: v })); setPage(1) }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">User</label>
                    <Select
                      value={filters.userId}
                      onValueChange={(v) => { setFilters((p) => ({ ...p, userId: v })); setPage(1) }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id || user._id} value={user.id || user._id}>
                            {user.name || user.email}
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
                      onChange={(e) => { setFilters((p) => ({ ...p, dateFrom: e.target.value })); setPage(1) }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Date To</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => { setFilters((p) => ({ ...p, dateTo: e.target.value })); setPage(1) }}
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      <X className="w-3 h-3 mr-1" />
                      Clear Filters
                    </Button>
                    <Button size="sm" onClick={() => { setPage(1) }}>
                      Apply Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Timestamp</TableHead>
                <TableHead className="w-[200px]">User</TableHead>
                <TableHead className="w-[110px]">Action</TableHead>
                <TableHead className="w-[120px]">Entity</TableHead>
                <TableHead className="w-[100px]">Entity ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[130px]">IP Address</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <AlertTriangle className="w-10 h-10 text-destructive" />
                      <p className="text-muted-foreground">
                        {error.response?.data?.message || 'Failed to load audit logs'}
                      </p>
                      <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="p-4 rounded-2xl bg-muted">
                        <Shield className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold">No audit logs found</h3>
                      <p className="text-muted-foreground max-w-sm">
                        {search || hasActiveFilters
                          ? 'Try adjusting your search or filters'
                          : 'System activity will be recorded here as actions are performed'}
                      </p>
                    </motion.div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((entry, idx) => {
                  const entryId = entry.id || entry._id || idx
                  const isSecurity = entry.action === 'LOGIN' || entry.action === 'LOGOUT'
                  return (
                    <TableRow
                      key={entryId}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(entry)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={entry.user?.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {getUserInitials(entry)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium leading-tight">
                              {entry.user?.name || entry.user?.email || 'System'}
                            </span>
                            {entry.user?.email && !entry.user?.name && (
                              <span className="text-[10px] text-muted-foreground">{entry.user?.email}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={entry.action} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {entry.entityType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">
                          {entry.entityId?.length > 10
                            ? `${entry.entityId.slice(0, 8)}...`
                            : entry.entityId || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate max-w-[300px] block">
                            {entry.description || '—'}
                          </span>
                          {isSecurity && <SecurityBadge />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">
                          {entry.ipAddress || entry.ip || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {logs.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalItems} total)
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
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, page - 2)
              const pageNum = start + i
              if (pageNum > totalPages) return null
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  className="w-9"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
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
      )}

      <DetailModal
        entry={selectedEntry}
        open={!!selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      />
    </motion.div>
  )
}
