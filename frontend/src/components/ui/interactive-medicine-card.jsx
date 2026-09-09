import { CheckCircle2, Pill, ShoppingCart, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const StatItem = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
  </div>
)

function getStockStatus(medicine) {
  if (medicine.availabilityStatus === 'UNAVAILABLE') return { key: 'out', label: 'Unavailable', dot: 'bg-muted-foreground/50' }
  if (medicine.availabilityStatus === 'LOW_STOCK') return { key: 'low', label: 'Low stock', dot: 'bg-amber-500' }
  if (medicine.availabilityStatus === 'IN_STOCK') return { key: 'in', label: 'In stock', dot: 'bg-emerald-500' }
  const stock = Number(medicine.currentStock ?? 0)
  const reorder = Number(medicine.reorderPoint ?? 0)
  if (stock <= 0) return { key: 'out', label: 'Out of stock', dot: 'bg-muted-foreground/50' }
  if (reorder > 0 && stock <= reorder) return { key: 'low', label: 'Low stock', dot: 'bg-amber-500' }
  return { key: 'in', label: 'In stock', dot: 'bg-emerald-500' }
}

const MedicineLogoStack = ({ imageUrl, name, size = 'lg' }) => {
  const box = size === 'sm' ? 'h-24 w-24' : 'h-40 w-40'
  const pill = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12'
  return (
    <div className="[perspective:800px]">
      <div className={cn('group relative [transform-style:preserve-3d]', box)}>
      <div className="absolute h-full w-full rounded-2xl bg-card-foreground/10 transition-transform duration-500 ease-in-out group-hover:[transform:translateZ(-28px)]" />
      <div className="absolute h-full w-full rounded-2xl bg-card-foreground/5 transition-transform duration-500 ease-in-out group-hover:[transform:translateZ(-14px)]" />
      <div className="absolute flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl transition-transform duration-500 ease-in-out group-hover:[transform:translateZ(0px)_rotateY(-20deg)_rotateX(15deg)] group-hover:scale-[1.05] group-hover:shadow-[0_8px_40px_rgba(0,0,0,0.15)]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent text-primary">
            <Pill className={pill} />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pharmacy
            </span>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

const InteractiveMedicineCard = ({
  medicine,
  publicMode = true,
  onView,
  onAdd,
  layout = 'split',
  className,
}) => {
  const imageUrl = medicine.imageUrl || medicine.image_url
  const isRx = medicine.classification === 'PRESCRIPTION_REQUIRED' || Boolean(medicine.requiresPrescription)
  const restricted = medicine.classification === 'RESTRICTED'
  const stock = getStockStatus(medicine)
  const name = medicine.name
  const category = medicine.categoryName || medicine.category_name || 'Pharmacy product'
  const price = Number(medicine.price ?? 0)
  const sellingUnit = medicine.sellingUnit || medicine.selling_unit || 'pack'
  const packSize = medicine.packSize || medicine.pack_size

  const content = (
    <div className="relative z-10 flex h-full w-full flex-col items-center text-center md:items-start md:text-left">
      <h3 className={cn(layout === 'stack' && 'line-clamp-2 text-lg font-medium', layout !== 'stack' && 'text-2xl font-semibold', 'tracking-tight')}>{name}</h3>
      <p className="mt-1 text-sm font-normal text-muted-foreground">{category}</p>

      <div className={cn('flex flex-wrap items-center justify-center gap-2 md:justify-start', layout === 'stack' ? 'mt-3' : 'mt-4')}>
        <span className={cn(layout === 'stack' ? 'text-lg font-semibold' : 'text-xl font-bold', 'tracking-tight')}>RWF {price.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">/ {packSize || sellingUnit}</span>
        <StatItem icon={CheckCircle2} label="Reviewed by a pharmacist" />
      </div>

      <div className={cn('mt-auto flex flex-wrap justify-center gap-3 md:justify-start', layout === 'stack' ? 'pt-4' : 'pt-6')}>
        {publicMode && !restricted && stock.key !== 'out' && (
          <Button variant="outline" onClick={(e) => { e.stopPropagation(); onAdd() }}>
            {isRx ? (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Request Rx
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to cart
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )

  const image = (
    <MedicineLogoStack
      imageUrl={imageUrl}
      name={name}
      size={layout === 'stack' ? 'sm' : 'lg'}
    />
  )

  return (
    <div
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onView()
        }
      }}
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-2xl border bg-card text-card-foreground transition-colors hover:border-primary/30',
        className
      )}
    >
      <div className="pointer-events-none absolute right-0 top-1/2 h-72 w-72 -translate-y-1/2 translate-x-1/4 bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--primary)/0.14)_0%,rgba(255,255,255,0)_100%)]" />
      {layout === 'split' ? (
        <div className="relative flex flex-col items-center gap-8 p-6 md:flex-row md:gap-12 md:p-8">
          {content}
          {image}
        </div>
      ) : (
        <div className="relative flex flex-col p-4">
          <div className="flex justify-center pb-3">{image}</div>
          {content}
        </div>
      )}
    </div>
  )
}

export default InteractiveMedicineCard