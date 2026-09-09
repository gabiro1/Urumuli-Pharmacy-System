import { Pencil, PackageMinus, Archive, Boxes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ProductImage } from './ProductImage'
import { StatusBadge } from './ProductCard'
import { money, stockState, expiryState, productTypeLabel, formatDateOnly } from '../productUtils'
import { cn } from '@/lib/utils'

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  )
}

function Section({ title, children }) {
  if (!children) return null
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div>{children}</div>
    </div>
  )
}

export default function ProductDetailDialog({ product, onClose, onEdit, onAdjust, onArchive }) {
  if (!product) return null
  const stock = stockState(product)
  const expiry = expiryState(product)
  const isMedicine = product.productType === 'MEDICINE'
  const profit = Number(product.price || 0) - Number(product.costPrice || 0)
  const margin = Number(product.price) > 0 ? (profit / Number(product.price)) * 100 : 0

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {product.sku ? `SKU: ${product.sku}` : 'No SKU'}
                {product.barcode ? ` · Barcode: ${product.barcode}` : ''}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="shrink-0">
              {productTypeLabel(product.productType)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[4/3] rounded-lg border" iconClassName="h-10 w-10" />
            <div className="flex flex-col items-center gap-1.5">
              <StatusBadge state={stock} />
              {expiry && <StatusBadge state={expiry} />}
              {product.isArchived && <Badge variant="secondary">Archived</Badge>}
              {!product.isActive && !product.isArchived && <Badge variant="secondary">Inactive</Badge>}
            </div>
          </div>

          <div className="space-y-5">
            <Section title="Overview">
              <DetailRow label="Category" value={product.categoryName} />
              <DetailRow label="Subcategory" value={product.subcategory} />
              <DetailRow label="Brand" value={product.brandName} />
              <DetailRow label="Manufacturer" value={product.manufacturer} />
              <DetailRow label="Supplier" value={product.supplierName} />
              <DetailRow label="Unit" value={product.sellingUnit} />
              <DetailRow label="Status" value={product.isArchived ? 'Archived' : product.isActive ? 'Active' : 'Inactive'} />
            </Section>

            {isMedicine && (
              <Section title="Medicine Information">
                <DetailRow label="Generic name" value={product.genericName} />
                <DetailRow label="Strength" value={product.strength} />
                <DetailRow label="Dosage form" value={product.dosageForm} />
                <DetailRow label="Route" value={product.routeOfAdministration} />
                <DetailRow label="Classification" value={product.classification?.replace('_', ' ')} />
                <DetailRow label="Prescription" value={product.requiresPrescription ? 'Required' : 'OTC'} />
                <DetailRow label="Controlled" value={product.isControlled ? 'Yes' : 'No'} />
                <DetailRow label="Pack size" value={product.packSize} />
                <DetailRow label="Active ingredients" value={product.activeIngredients} />
                <DetailRow label="Dosage instructions" value={product.dosageInstructions} />
                <DetailRow label="Contraindications" value={product.contraindications} />
              </Section>
            )}

            {!isMedicine && (
              <Section title="Pharmacy Care Information">
                <DetailRow label="Care purpose" value={product.carePurpose} />
                <DetailRow label="Size / volume" value={product.sizeDescription} />
                <DetailRow label="Ingredients" value={product.ingredients} />
                <DetailRow label="Usage instructions" value={product.usageInstructions} />
              </Section>
            )}

            <Section title="Pricing & Stock">
              <DetailRow label="Selling price" value={money(product.price)} />
              <DetailRow label="Purchase price" value={money(product.costPrice)} />
              <DetailRow label="Profit / unit" value={`${money(profit)} (${margin.toFixed(1)}%)`} />
              <DetailRow label="Current stock" value={product.currentStock} />
              <DetailRow label="Min. stock level" value={product.minStockLevel} />
              <DetailRow label="Reorder point" value={product.reorderPoint} />
            </Section>

            <Section title="Additional Information">
              <DetailRow label="Description" value={product.description} />
              <DetailRow label="Warnings" value={product.generalWarnings} />
              <DetailRow label="Storage conditions" value={product.storageConditions} />
              <DetailRow label="Expiry date" value={formatDateOnly(product.expiryDate)} />
              <DetailRow label="Created" value={formatDateOnly(product.createdAt)} />
              <DetailRow label="Updated" value={formatDateOnly(product.updatedAt)} />
            </Section>
          </div>
        </div>

        <Separator />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onAdjust}>
            <PackageMinus className="mr-2 h-4 w-4" /> Adjust Stock
          </Button>
          <Button variant="outline" size="sm" onClick={() => onClose(false)}>
            <Boxes className="mr-2 h-4 w-4" /> Close
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('ml-auto text-destructive hover:text-destructive hover:bg-destructive/10')}
            onClick={onArchive}
          >
            <Archive className="mr-2 h-4 w-4" /> Archive
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
