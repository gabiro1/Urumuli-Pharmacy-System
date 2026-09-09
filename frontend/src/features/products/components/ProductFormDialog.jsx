import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, PackagePlus, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductImageUpload } from './ProductImageUpload'
import {
  EMPTY_FORM,
  toFormValues,
  asPayload,
  money,
} from '../productUtils'
import { PRODUCT_TYPES, DOSAGE_FORMS, ROUTES_OF_ADMINISTRATION, CLASSIFICATIONS } from '../productConstants'
import { cn } from '@/lib/utils'

function Field({ label, required, error, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="border-b pb-2">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
    </div>
  )
}

export default function ProductFormDialog({ open, onOpenChange, product, categories, suppliers, defaultType = 'MEDICINE', onSaved }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [image, setImage] = useState(null)
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const isEdit = Boolean(product?.id)

  useEffect(() => {
    if (!open) return
    if (product?.id) {
      setForm(toFormValues(product))
      setImage(product.imageUrl ? { existingUrl: product.imageUrl, removeExisting: false } : null)
    } else {
      setForm({ ...EMPTY_FORM, productType: defaultType })
      setImage(null)
    }
    setErrors({})
  }, [open, product, defaultType])

  const medicine = form.productType === 'MEDICINE'

  const profit = useMemo(() => {
    const price = Number(form.price || 0)
    const cost = Number(form.costPrice || 0)
    const perUnit = price - cost
    const margin = price > 0 ? (perUnit / price) * 100 : 0
    return { perUnit, margin }
  }, [form.price, form.costPrice])

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Product name is required'
    if (!form.categoryId) next.categoryId = 'Category is required'
    for (const field of ['price', 'costPrice', 'currentStock', 'minStockLevel']) {
      const value = Number(form[field])
      if (form[field] !== '' && form[field] !== null && (isNaN(value) || value < 0)) {
        next[field] = `${field} cannot be negative`
      }
    }
    if (form.expiryDate && isNaN(new Date(form.expiryDate).getTime())) {
      next.expiryDate = 'Enter a valid expiry date'
    }
    if (medicine && !form.dosageForm) next.dosageForm = 'Dosage form is required for medicines'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = asPayload(form)
      if (isEdit) {
        if (image?.removeExisting) payload.imageUrl = null
        return api.put(`/inventory/products/${product.id}`, payload)
      }
      return api.post('/inventory/products', payload)
    },
  })

  async function handleSave({ resetAfter }) {
    if (!validate()) return
    setIsSaving(true)
    try {
      const response = await saveMutation.mutateAsync()
      let saved = response.data.data

      if (image?.file) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('image', image.file)
        const upload = await api.post(`/inventory/products/${saved.id}/image`, formData)
        saved = upload.data.data
      }

      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      toast.success(isEdit ? 'Product updated' : 'Product added')

      if (resetAfter) {
        setForm({ ...EMPTY_FORM, productType: defaultType })
        setImage(null)
        setErrors({})
      } else {
        onOpenChange(false)
      }
      onSaved?.(saved)
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Unable to save product')
    } finally {
      setIsUploading(false)
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Product' : 'Add Product'}
          </DialogTitle>
          <DialogDescription>
            Complete the sections relevant to this pharmacy product. Fields adapt to the selected product type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1 — Basic Information */}
          <section className="space-y-4">
            <SectionTitle>Basic Information</SectionTitle>
            <ProductImageUpload value={image} onChange={setImage} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" required error={errors.name} className="sm:col-span-2">
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Paracetamol 500mg" />
              </Field>
              <Field label="Product type" required>
                <Select value={form.productType} onValueChange={(value) => set('productType', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Category" required error={errors.categoryId}>
                <Select value={form.categoryId || 'none'} onValueChange={(value) => set('categoryId', value === 'none' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Subcategory">
                <Input value={form.subcategory || ''} onChange={(e) => set('subcategory', e.target.value)} placeholder="e.g. Pain Relief, Moisturizer" />
              </Field>
              <Field label="Brand / manufacturer">
                <Input value={form.brandName || ''} onChange={(e) => set('brandName', e.target.value)} />
              </Field>
              <Field label="SKU">
                <Input value={form.sku || ''} onChange={(e) => set('sku', e.target.value)} />
              </Field>
              <Field label="Barcode">
                <Input value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Section 2 — Type-specific information */}
          <section className="space-y-4">
            <SectionTitle>{medicine ? 'Medicine Information' : 'Pharmacy Care Information'}</SectionTitle>
            {medicine ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Generic name">
                  <Input value={form.genericName || ''} onChange={(e) => set('genericName', e.target.value)} placeholder="e.g. Acetaminophen" />
                </Field>
                <Field label="Strength">
                  <Input value={form.strength || ''} onChange={(e) => set('strength', e.target.value)} placeholder="e.g. 500mg" />
                </Field>
                <Field label="Dosage form" required error={errors.dosageForm}>
                  <Select value={form.dosageForm || 'none'} onValueChange={(value) => set('dosageForm', value === 'none' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Select dosage form" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {DOSAGE_FORMS.map((dosage) => (
                        <SelectItem key={dosage} value={dosage}>{dosage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Route of administration">
                  <Select value={form.routeOfAdministration || 'none'} onValueChange={(value) => set('routeOfAdministration', value === 'none' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {ROUTES_OF_ADMINISTRATION.map((route) => (
                        <SelectItem key={route} value={route}>{route}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Classification">
                  <Select value={form.classification} onValueChange={(value) => set('classification', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATIONS.map((classification) => (
                        <SelectItem key={classification.value} value={classification.value}>{classification.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Pack size">
                  <Input value={form.packSize || ''} onChange={(e) => set('packSize', e.target.value)} placeholder="e.g. 20 tablets" />
                </Field>
                <Field label="Active ingredients" className="sm:col-span-2">
                  <Textarea value={form.activeIngredients || ''} onChange={(e) => set('activeIngredients', e.target.value)} rows={2} placeholder="Comma-separated active ingredients" />
                </Field>
                <Field label="Dosage instructions" className="sm:col-span-2">
                  <Textarea value={form.dosageInstructions || ''} onChange={(e) => set('dosageInstructions', e.target.value)} rows={2} />
                </Field>
                <Field label="Contraindications" className="sm:col-span-2">
                  <Textarea value={form.contraindications || ''} onChange={(e) => set('contraindications', e.target.value)} rows={2} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckboxField label="Requires prescription" checked={form.requiresPrescription} onChange={(value) => set('requiresPrescription', value)} />
                  <CheckboxField label="Controlled medicine" checked={form.isControlled} onChange={(value) => set('isControlled', value)} />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Care purpose">
                  <Input value={form.carePurpose || ''} onChange={(e) => set('carePurpose', e.target.value)} placeholder="e.g. Anti-dandruff scalp care" />
                </Field>
                <Field label="Size / volume / weight">
                  <Input value={form.sizeDescription || ''} onChange={(e) => set('sizeDescription', e.target.value)} placeholder="e.g. 200 ml" />
                </Field>
                <Field label="Ingredients" className="sm:col-span-2">
                  <Textarea value={form.ingredients || ''} onChange={(e) => set('ingredients', e.target.value)} rows={2} />
                </Field>
                <Field label="Usage instructions" className="sm:col-span-2">
                  <Textarea value={form.usageInstructions || ''} onChange={(e) => set('usageInstructions', e.target.value)} rows={2} />
                </Field>
              </div>
            )}
          </section>

          {/* Section 3 — Pricing & Inventory */}
          <section className="space-y-4">
            <SectionTitle>Pricing & Inventory</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Purchase price" error={errors.costPrice}>
                <Input type="number" min="0" step="0.01" value={form.costPrice ?? ''} onChange={(e) => set('costPrice', e.target.value)} />
              </Field>
              <Field label="Selling price" error={errors.price}>
                <Input type="number" min="0" step="0.01" value={form.price ?? ''} onChange={(e) => set('price', e.target.value)} />
              </Field>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Profit</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm">
                  <TrendingUp className={cn('h-4 w-4', profit.perUnit >= 0 ? 'text-green-600' : 'text-destructive')} />
                  <span className="font-semibold tabular-nums">{money(profit.perUnit)}</span>
                  <Badge variant="outline" className="text-[10px] tabular-nums">
                    {Number.isFinite(profit.margin) ? `${profit.margin.toFixed(1)}%` : '—'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Stock quantity" error={errors.currentStock}>
                <Input type="number" min="0" value={form.currentStock ?? ''} onChange={(e) => set('currentStock', e.target.value)} />
              </Field>
              <Field label="Minimum stock level" error={errors.minStockLevel}>
                <Input type="number" min="0" value={form.minStockLevel ?? ''} onChange={(e) => set('minStockLevel', e.target.value)} />
              </Field>
              <Field label="Reorder point">
                <Input type="number" min="0" value={form.reorderPoint ?? ''} onChange={(e) => set('reorderPoint', e.target.value)} />
              </Field>
              <Field label="Unit">
                <Input value={form.sellingUnit || ''} onChange={(e) => set('sellingUnit', e.target.value)} placeholder="pack, unit, bottle" />
              </Field>
              <Field label="Supplier" className="sm:col-span-2">
                <Select value={form.supplierId || 'none'} onValueChange={(value) => set('supplierId', value === 'none' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supplier</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          {/* Section 4 — Additional Information */}
          <section className="space-y-4">
            <SectionTitle>Additional Information</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Manufacturer" className="sm:col-span-2">
                <Input value={form.manufacturer || ''} onChange={(e) => set('manufacturer', e.target.value)} />
              </Field>
              <Field label="Expiry date" error={errors.expiryDate}>
                <Input type="date" value={form.expiryDate || ''} onChange={(e) => set('expiryDate', e.target.value)} />
              </Field>
              <Field label="Storage conditions">
                <Input value={form.storageConditions || ''} onChange={(e) => set('storageConditions', e.target.value)} placeholder="e.g. Store below 30°C" />
              </Field>
              <Field label="Warnings" className="sm:col-span-2">
                <Textarea value={form.warnings || ''} onChange={(e) => set('warnings', e.target.value)} rows={2} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={3} />
              </Field>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isUploading}>
            Cancel
          </Button>
          {!isEdit && (
            <Button variant="secondary" onClick={() => handleSave({ resetAfter: true })} disabled={isSaving || isUploading}>
              {isSaving && !isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save &amp; Add Another
            </Button>
          )}
          <Button onClick={() => handleSave({ resetAfter: false })} disabled={isSaving || isUploading}>
            {isSaving || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isUploading ? 'Uploading image…' : isEdit ? 'Save Product' : 'Save Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
