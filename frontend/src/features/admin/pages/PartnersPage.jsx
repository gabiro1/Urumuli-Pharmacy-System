import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  HeartPulse,
  ShieldCheck,
  Building2,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const PARTNER_TYPES = [
  { id: 'PHARMACY', label: 'Pharmacy', color: 'green' },
  { id: 'INSURANCE', label: 'Insurance', color: 'blue' },
  { id: 'OTHER', label: 'Other', color: 'purple' },
]

function partnerIcon(type) {
  if (type === 'PHARMACY') return HeartPulse
  if (type === 'INSURANCE') return ShieldCheck
  return Building2
}

const emptyForm = {
  name: '',
  partner_type: 'PHARMACY',
  website_url: '',
  logo_url: '',
  description: '',
  display_order: 0,
  is_active: true,
}

function PartnerFormDialog({ open, onOpenChange, partner }) {
  const queryClient = useQueryClient()
  const isEdit = !!partner
  const [form, setForm] = useState(partner ? { ...emptyForm, ...partner } : { ...emptyForm })
  const [errors, setErrors] = useState({})

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/partners/${partner.id}`, data) : api.post('/partners', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      toast.success(isEdit ? 'Partner updated successfully' : 'Partner added successfully')
      onOpenChange(false)
      setForm({ ...emptyForm })
      setErrors({})
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Failed to save partner'
      toast.error(msg)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    mutation.mutate({
      name: form.name.trim(),
      partner_type: form.partner_type,
      website_url: form.website_url?.trim() || null,
      logo_url: form.logo_url?.trim() || null,
      description: form.description?.trim() || null,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
    })
  }

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {isEdit ? 'Edit Partner' : 'Add Partner'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update partner details'
              : 'Add a new pharmacy, insurance, or other partner'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name *</label>
            <Input
              placeholder="e.g. Kigali Health Pharmacy"
              value={form.name}
              onChange={set('name')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={form.partner_type}
                onValueChange={(v) => setForm((p) => ({ ...p, partner_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Display Order</label>
              <Input
                type="number"
                min="0"
                value={form.display_order}
                onChange={set('display_order')}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Website URL</label>
            <Input
              type="url"
              placeholder="https://..."
              value={form.website_url || ''}
              onChange={set('website_url')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Logo URL</label>
            <Input
              type="url"
              placeholder="https://.../logo.png (optional)"
              value={form.logo_url || ''}
              onChange={set('logo_url')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              rows={3}
              placeholder="Short description (optional)"
              value={form.description || ''}
              onChange={set('description')}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <>{isEdit ? 'Save Changes' : 'Add Partner'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeletePartnerDialog({ partner, open, onOpenChange }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => api.delete(`/partners/${partner.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      toast.success('Partner removed successfully')
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to remove partner')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Remove Partner
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{' '}
            <span className="font-medium">{partner?.name}</span>? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Removing...</>
            ) : (
              'Remove'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PartnersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [addDialog, setAddDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['partners'],
    queryFn: () => api.get('/partners').then((r) => r.data?.data || []),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, partner }) =>
      api.put(`/partners/${id}`, {
        name: partner.name,
        partner_type: partner.partner_type,
        website_url: partner.website_url,
        logo_url: partner.logo_url,
        description: partner.description,
        display_order: partner.display_order,
        is_active: !partner.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update partner')
    },
  })

  const partners = data || []

  const filtered = partners.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.partner_type || '').toLowerCase().includes(q)
    )
  })

  const TypeBadge = ({ type }) => {
    const config = PARTNER_TYPES.find((t) => t.id === type)
    return <Badge color={config?.color} className="text-xs font-medium px-3 py-1">{config?.label || type}</Badge>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partners</h1>
          <p className="text-muted-foreground mt-1">
            Manage the partners shown on the landing page
          </p>
        </div>
        <Button onClick={() => setAddDialog(true)} className="shrink-0 h-11">
          <Plus className="w-4 h-4 mr-2" />
          Add Partner
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'partner' : 'partners'}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="w-10 h-10 text-destructive" />
              <p className="text-muted-foreground">
                {error.response?.data?.error || 'Failed to load partners'}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-4 rounded-2xl bg-muted">
                <Building2 className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                {search ? 'No partners found' : 'No partners yet'}
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm text-center">
                {search
                  ? 'Try a different search term'
                  : 'Add your first partner to display them on the landing page'}
              </p>
              {!search && (
                <Button onClick={() => setAddDialog(true)} className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Partner
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((partner) => {
                    const Icon = partnerIcon(partner.partner_type)
                    return (
                      <TableRow key={partner.id} className="transition-colors hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                              partner.partner_type === 'PHARMACY' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                              partner.partner_type === 'INSURANCE' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                              partner.partner_type === 'OTHER' && 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{partner.name}</p>
                              {partner.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-[280px]">
                                  {partner.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={partner.partner_type} />
                        </TableCell>
                        <TableCell>
                          {partner.is_active ? (
                            <Badge color="green" className="gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {partner.website_url ? (
                            <a
                              href={partner.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                            >
                              Visit
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                toggleMutation.mutate({
                                  id: partner.id,
                                  partner,
                                })
                              }
                              title={partner.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {partner.is_active ? (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <Eye className="w-4 h-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditDialog(partner)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteDialog(partner)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PartnerFormDialog open={addDialog} onOpenChange={setAddDialog} />
      <PartnerFormDialog
        key={editDialog?.id || 'new'}
        partner={editDialog}
        open={!!editDialog}
        onOpenChange={(open) => !open && setEditDialog(null)}
      />
      <DeletePartnerDialog
        partner={deleteDialog}
        open={!!deleteDialog}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
      />
    </motion.div>
  )
}
