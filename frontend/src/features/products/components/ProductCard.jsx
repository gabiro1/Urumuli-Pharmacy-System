import { Eye, ShoppingCart, FileText, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { money, stockState } from '../productUtils'

export function StatusBadge({ state }) {
  if (!state) return null
  return <Badge variant={state.variant || 'outline'} className="text-[10px]">{state.label}</Badge>
}

export default function ProductCard({ product, onView, onEdit }) {
  const isRx = product.requiresPrescription || product.classification === 'PRESCRIPTION_REQUIRED'
  const stock = stockState(product)

  return (
    <div
      className="group relative overflow-hidden rounded-2xl cursor-pointer border border-border/70 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
      style={{ aspectRatio: '1.35/1' }}
      onClick={onView}
    >
      {/* Background image */}
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Package className="h-12 w-12 text-muted-foreground/30" />
        </div>
      )}

      {/* Permanent bottom gradient so name/price are always readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.15) 50%, transparent 75%)' }}
      />

      {/* Hover darkening overlay */}
      <div className="absolute inset-0 pointer-events-none bg-black/0 transition-colors duration-300 group-hover:bg-black/30" />

      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className={isRx ? 'rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white' : 'rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white'}>{isRx ? 'Rx' : 'OTC'}</span>
      </div>
      <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"><span className={stock.key === 'in' ? 'h-2 w-2 rounded-full bg-emerald-400' : stock.key === 'low' ? 'h-2 w-2 rounded-full bg-amber-400' : 'h-2 w-2 rounded-full bg-white/50'} />{stock.label}</span>

      {/* Always-visible bottom info bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 pb-5 pointer-events-none">
        <div className="min-w-0"><p className="truncate text-lg font-semibold text-white drop-shadow" title={product.name}>{product.name}</p><p className="mt-1 truncate text-sm text-white/75">{product.categoryName || 'Pharmacy product'}</p></div>
        <div className="shrink-0 text-right"><p className="text-xl font-bold text-white drop-shadow">{money(product.price)}</p><p className="mt-1 text-xs text-white/70">{product.packSize ? `Per ${product.packSize}` : `Per ${product.sellingUnit || 'pack'}`}</p></div>
      </div>

      {/* Hover action buttons — slide up from bottom, sit above the info bar */}
      <div
        className="absolute inset-0 flex items-center justify-center gap-5 bg-black/75 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          variant="secondary"
          className="flex h-20 w-20 flex-col gap-2 rounded-full border border-white/40 bg-transparent text-sm font-medium text-white hover:bg-white/15"
          onClick={(e) => { e.stopPropagation(); onView() }}
        >
          <Eye className="h-7 w-7" /> View Details
        </Button>
        <Button
          size="sm"
          className="flex h-20 w-20 flex-col gap-2 rounded-full border border-white/40 bg-transparent text-sm font-medium text-white hover:bg-white/15"
          onClick={(e) => { e.stopPropagation(); onEdit() }}
        >
          {isRx
            ? <><FileText className="h-7 w-7" /> Request Rx</>
            : <><ShoppingCart className="h-7 w-7" /> Add to Cart</>
          }
        </Button>
      </div>
    </div>
  )
}
