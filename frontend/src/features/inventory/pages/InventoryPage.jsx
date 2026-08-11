import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Package,
  ClipboardList,
  Warehouse,
  Tags,
  Loader2,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import StatsCard from '@/components/shared/StatsCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SuppliersTab from '@/features/inventory/components/SuppliersTab'
import BatchesTab from '@/features/inventory/components/BatchesTab'
import MovementsTab from '@/features/inventory/components/MovementsTab'

const EMPTY_FORM = {
  name: '',
  genericName: '',
  brandName: '',
  categoryId: '',
  manufacturer: '',
  price: '0',
  currentStock: '0',
  minStockLevel: '10',
  reorderPoint: '20',
  strength: '',
  dosageForm: '',
  barcode: '',
  description: '',
  tags: '',
  requiresPrescription: false,
  isControlled: false,
  isActive: true,
}

function asFormValues(medicine) {
  if (!medicine) return { ...EMPTY_FORM }
  return {
    name: medicine.name || '',
    genericName: medicine.genericName || medicine.generic_name || '',
    brandName: medicine.brandName || medicine.brand_name || '',
    categoryId: medicine.categoryId || medicine.category_id || '',
    manufacturer: medicine.manufacturer || '',
    price: String(medicine.price ?? 0),
    currentStock: String(medicine.currentStock ?? medicine.current_stock ?? 0),
    minStockLevel: String(medicine.minStockLevel ?? medicine.min_stock_level ?? 10),
    reorderPoint: String(medicine.reorderPoint ?? medicine.reorder_point ?? 20),
    strength: medicine.strength || '',
    dosageForm: medicine.dosageForm || medicine.dosage_form || '',
    barcode: medicine.barcode || '',
    description: medicine.description || '',
    tags: Array.isArray(medicine.tags) ? medicine.tags.join(', ') : (medicine.tags || ''),
    requiresPrescription: Boolean(medicine.requiresPrescription ?? medicine.requires_prescription),
    isControlled: Boolean(medicine.isControlled ?? medicine.is_controlled),
    isActive: medicine.isActive ?? medicine.is_active ?? true,
  }
}

function toPayload(form) {
  return {
    ...form,
    categoryId: form.categoryId || null,
    price: Number(form.price || 0),
    currentStock: Number(form.currentStock || 0),
    minStockLevel: Number(form.minStockLevel || 0),
    reorderPoint: Number(form.reorderPoint || 0),
  }
}

function MedicineEditor({ open, onOpenChange, categories, medicine, form, setForm, onSubmit, isSaving }) {
  const title = medicine ? 'Edit Medicine' : 'Add Medicine'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Manage medicine details, stock, and catalogue visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Medicine Name *</label>
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Generic Name</label>
            <Input value={form.genericName} onChange={(e) => setForm((prev) => ({ ...prev, genericName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Brand Name</label>
            <Input value={form.brandName} onChange={(e) => setForm((prev) => ({ ...prev, brandName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={form.categoryId || 'none'} onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value === 'none' ? '' : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Manufacturer</label>
            <Input value={form.manufacturer} onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Barcode</label>
            <Input value={form.barcode} onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Price</label>
            <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Stock</label>
            <Input type="number" min="0" value={form.currentStock} onChange={(e) => setForm((prev) => ({ ...prev, currentStock: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Minimum Stock</label>
            <Input type="number" min="0" value={form.minStockLevel} onChange={(e) => setForm((prev) => ({ ...prev, minStockLevel: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reorder Point</label>
            <Input type="number" min="0" value={form.reorderPoint} onChange={(e) => setForm((prev) => ({ ...prev, reorderPoint: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Strength</label>
            <Input value={form.strength} onChange={(e) => setForm((prev) => ({ ...prev, strength: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dosage Form</label>
            <Input value={form.dosageForm} onChange={(e) => setForm((prev) => ({ ...prev, dosageForm: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <Input value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="pain, fever, otc" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} />
          </div>
          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.requiresPrescription}
                onChange={(e) => setForm((prev) => ({ ...prev, requiresPrescription: e.target.checked }))}
              />
              Requires prescription
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isControlled}
                onChange={(e) => setForm((prev) => ({ ...prev, isControlled: e.target.checked }))}
              />
              Controlled medicine
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Active
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {medicine ? 'Save Changes' : 'Create Medicine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function CompactStat({ icon: Icon, label, value, variant = 'primary' }) {
  const colors = {
    primary: 'text-primary bg-primary/10',
    success: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40',
    danger: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40',
    info: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40',
  }
  return (
    <div className="rounded-lg border border-border/40 bg-card p-3 space-y-1.5 hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {label}
        </span>
        <div className={cn('p-1.5 rounded-md', colors[variant])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <span className="text-xl font-bold tabular-nums text-foreground">{value ?? '-'}</span>
    </div>
  )
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
  }, [searchParams])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const summaryQuery = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => api.get('/inventory/summary').then((res) => res.data),
  })

  const categoriesQuery = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => api.get('/inventory/categories').then((res) => res.data),
  })

  const medicinesQuery = useQuery({
    queryKey: ['inventory-medicines', debouncedSearch, categoryFilter, activeFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter)
      if (activeFilter !== 'all') params.set('isActive', activeFilter)
      params.set('limit', '50')
      return api.get(`/inventory/medicines?${params.toString()}`).then((res) => res.data)
    },
  })

  const categories = categoriesQuery.data?.data || []
  const summary = summaryQuery.data?.data || {}
  const medicines = medicinesQuery.data?.data || []

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form)
      return editingMedicine
        ? api.put(`/inventory/medicines/${editingMedicine.id}`, payload)
        : api.post('/inventory/medicines', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-medicines'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      setEditorOpen(false)
      setEditingMedicine(null)
      setForm({ ...EMPTY_FORM })
      toast.success(editingMedicine ? 'Medicine updated' : 'Medicine created')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to save medicine')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (medicineId) => api.delete(`/inventory/medicines/${medicineId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-medicines'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      toast.success('Medicine deleted')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to delete medicine')
    },
  })

  const openEditor = (medicine = null) => {
    setEditingMedicine(medicine)
    setForm(asFormValues(medicine))
    setEditorOpen(true)
  }

  const handleDelete = (medicine) => {
    if (window.confirm(`Delete ${medicine.name}? This cannot be undone.`)) {
      deleteMutation.mutate(medicine.id)
    }
  }

  const isSaving = saveMutation.isPending
  const hasMedicines = medicines.length > 0

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage medicine catalogue, stock levels, and expiry risk.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['inventory-medicines'] })
              queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => openEditor()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Medicine
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CompactStat icon={Package} label="Medicines" value={summary.medicines} variant="primary" />
        <CompactStat icon={AlertTriangle} label="Low Stock" value={summary.lowStock} variant="warning" />
        <CompactStat icon={Warehouse} label="Expiring" value={summary.expiringBatches} variant="danger" />
        <CompactStat icon={ClipboardList} label="Categories" value={summary.categories} variant="info" />
      </motion.div>

      <motion.div variants={itemVariants}>
      <Tabs defaultValue="medicines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="medicines">Medicines</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="medicines" className="space-y-4">
        <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicines, symptoms, barcodes..."
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Active status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <motion.div variants={itemVariants}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Medicine Catalogue</CardTitle>
          <span className="text-xs text-muted-foreground">{medicines.length} results</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicinesQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !hasMedicines ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Tags className="w-10 h-10 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {search || categoryFilter !== 'all' || activeFilter !== 'all'
                          ? 'No medicines match the current filters'
                          : 'No medicines have been added yet'}
                      </p>
                      <Button onClick={() => openEditor()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add the first medicine
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                medicines.map((medicine) => {
                  const lowStock = (medicine.currentStock ?? medicine.current_stock ?? 0) <= (medicine.reorderPoint ?? medicine.reorder_point ?? 0)
                  return (
                    <TableRow key={medicine.id} className={cn(lowStock && 'bg-red-50/50 dark:bg-red-950/20')}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{medicine.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {medicine.generic_name || medicine.genericName || 'No generic name'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{medicine.categoryName || medicine.category_name || 'Uncategorized'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{medicine.currentStock ?? medicine.current_stock ?? 0}</p>
                          <p className="text-xs text-muted-foreground">
                            Reorder at {medicine.reorderPoint ?? medicine.reorder_point ?? 0}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">RWF {Number(medicine.price || 0).toLocaleString()}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge color={medicine.isActive || medicine.is_active ? 'green' : 'default'}>
                            {medicine.isActive || medicine.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {lowStock && <Badge color="red">Low stock</Badge>}
                          {(medicine.requiresPrescription || medicine.requires_prescription) && <Badge color="yellow">Rx</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEditor(medicine)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDelete(medicine)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </motion.div>

        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>

        <TabsContent value="batches">
          <BatchesTab />
        </TabsContent>

        <TabsContent value="movements">
          <MovementsTab />
        </TabsContent>
      </Tabs>
      </motion.div>

      <MedicineEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        categories={categories}
        medicine={editingMedicine}
        form={form}
        setForm={setForm}
        onSubmit={() => saveMutation.mutate()}
        isSaving={isSaving}
      />
    </motion.div>
  )
}
