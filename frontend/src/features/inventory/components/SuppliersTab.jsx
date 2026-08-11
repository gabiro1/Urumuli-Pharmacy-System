import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Building2, Phone, Mail, MapPin } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const EMPTY = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  taxId: '',
  paymentTerms: '',
  notes: '',
  isActive: true,
}

function asForm(supplier) {
  if (!supplier) return { ...EMPTY }
  return {
    name: supplier.name || '',
    contactPerson: supplier.contactPerson || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    address: supplier.address || '',
    city: supplier.city || '',
    taxId: supplier.taxId || '',
    paymentTerms: supplier.paymentTerms || '',
    notes: supplier.notes || '',
    isActive: supplier.isActive ?? true,
  }
}

export default function SuppliersTab() {
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY })

  const suppliersQuery = useQuery({
    queryKey: ['inventory-suppliers'],
    queryFn: () => api.get('/inventory/suppliers?limit=100').then((res) => res.data),
  })
  const suppliers = suppliersQuery.data?.data || []

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? api.put(`/inventory/suppliers/${editing.id}`, form) : api.post('/inventory/suppliers', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers'] })
      setEditorOpen(false)
      setEditing(null)
      setForm({ ...EMPTY })
      toast.success(editing ? 'Supplier updated' : 'Supplier created')
    },
    onError: (error) => toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to save supplier'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/inventory/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers'] })
      toast.success('Supplier deleted')
    },
    onError: (error) => toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to delete supplier'),
  })

  const openEditor = (supplier = null) => {
    setEditing(supplier)
    setForm(asForm(supplier))
    setEditorOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Suppliers</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{suppliers.length} suppliers</span>
          <Button size="sm" onClick={() => openEditor()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliersQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No suppliers yet. Add your first supplier to track batches.</p>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{supplier.city || '—'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{supplier.phone || '—'}</p>
                      <p className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{supplier.email || '—'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{supplier.address || 'No address'}</p>
                      {supplier.taxId && <p className="text-xs text-muted-foreground">Tax: {supplier.taxId}</p>}
                      {supplier.contactPerson && <p className="text-xs text-muted-foreground">Contact: {supplier.contactPerson}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={supplier.isActive ? 'green' : 'default'}>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(supplier.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" onClick={() => openEditor(supplier)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => {
                        if (window.confirm(`Delete supplier ${supplier.name}?`)) deleteMutation.mutate(supplier.id)
                      }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
            <DialogDescription>Supplier details used to attribute incoming stock batches.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier name *</label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact person</label>
              <Input value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tax ID</label>
              <Input value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment terms</label>
              <Input value={form.paymentTerms} onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))} placeholder="Net 30" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Active supplier
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
