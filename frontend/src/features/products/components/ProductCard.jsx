import { Eye, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MedicineLogoStack } from '@/components/ui/interactive-medicine-card'
import { money, stockState } from '../productUtils'

export function StatusBadge({ state }) {
  if (!state) return null
  return <Badge variant={state.variant || 'outline'} className="text-[10px]">{state.label}</Badge>
}

export default function ProductCard({ product, onView, onEdit }) {
  const isRx = product.requiresPrescription || product.classification === 'PRESCRIPTION_REQUIRED'
  const stock = stockState(product)
  const imageUrl = product.imageUrl || product.image_url
  const name = product.name
  const category = product.categoryName || product.category_name || 'Pharmacy product'
  const price = Number(product.price ?? 0)
  const sellingUnit = product.sellingUnit || product.selling_unit || 'pack'
  const packSize = product.packSize || product.pack_size

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => {
        if (!e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onView()
        }
      }}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground transition-all duration-300 hover:border-primary/30 hover:shadow-md"
    >
      <div className="pointer-events-none absolute right-0 top-1/2 h-72 w-72 -translate-y-1/2 translate-x-1/4 bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--primary)/0.14)_0%,rgba(255,255,255,0)_100%)]" />

      <div className="relative flex justify-center px-4 pt-4">
        <MedicineLogoStack imageUrl={imageUrl} name={name} />
        <span
          className={cn(
            'absolute right-3 top-2 rounded-full border px-2 py-0.5 text-[10px] font-medium text-white shadow-sm',
            isRx ? 'border-transparent bg-amber-500/90' : 'border-transparent bg-emerald-500/90'
          )}
        >
          {isRx ? 'Rx required' : 'OTC'}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-medium tracking-tight">{name}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{category}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">{money(price)}</span>
          <span className="text-xs text-muted-foreground">/ {packSize || sellingUnit}</span>
          <StatusBadge state={stock} />
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              onView()
            }}
          >
            <Eye className="mr-1.5 h-4 w-4" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="mr-1.5 h-4 w-4" /> Edit
          </Button>
        </div>
      </div>
    </div>
  )
}