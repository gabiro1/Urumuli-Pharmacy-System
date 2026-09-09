import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Minus,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Upload,
  Package,
  Building2,
  Tags,
  Layers,
  Ruler,
  Truck,
  Route,
  FlaskConical,
  Snowflake,
  AlertTriangle,
  Ban,
  Stethoscope,
  ClipboardList,
  CheckCircle2,
  ShieldCheck,
  HeartPulse,
} from 'lucide-react'
import api from '@/lib/api'
import { useCartStore } from '@/stores/cartStore'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const spring = { type: 'spring', stiffness: 220, damping: 24 }

const Reveal = ({ children, delay = 0, className, y = 24 }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
)

function getStock(medicine) {
  if (medicine.availabilityStatus === 'UNAVAILABLE') return { label: 'Unavailable', dot: 'bg-muted-foreground/50', text: 'text-muted-foreground' }
  if (medicine.availabilityStatus === 'LOW_STOCK') return { label: 'Low stock', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
  if (medicine.availabilityStatus === 'IN_STOCK') return { label: 'In stock', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
  const stock = Number(medicine.currentStock ?? 0)
  const reorder = Number(medicine.reorderPoint ?? 0)
  if (stock <= 0) return { label: 'Out of stock', dot: 'bg-muted-foreground/50', text: 'text-muted-foreground' }
  if (reorder > 0 && stock <= reorder) return { label: 'Low stock', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
  return { label: 'In stock', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
}

const HexIcon = ({ icon: Icon, tint = 'text-primary', bg = 'bg-primary/10', size = 'h-4 w-4', box = 'h-9 w-9' }) => (
  <div className={cn('flex shrink-0 items-center justify-center rounded-xl', box, bg)}>
    <Icon className={cn(size, tint)} />
  </div>
)

const InfoRow = ({ icon, label, value }) =>
  value ? (
    <div className="flex items-start gap-3">
      <HexIcon icon={icon} />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium capitalize">{value}</p>
      </div>
    </div>
  ) : null

export default function MedicineDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const [quantity, setQuantity] = useState(1)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['medicine', id],
    queryFn: () => api.get(`/inventory/medicines/${id}`).then((r) => r.data.data),
  })

  const unavailable = data?.availabilityStatus === 'UNAVAILABLE'
  const rx = data?.classification === 'PRESCRIPTION_REQUIRED'
  const restricted = data?.classification === 'RESTRICTED'
  const stock = data ? getStock(data) : null

  const act = () => {
    if (rx) {
      navigate(`/medicines/${data.id}/prescription`)
      return
    }
    addItem(data, quantity)
    navigate('/cart')
  }

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  }
  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  }

  const info = data
    ? [
        { id: 'manufacturer', icon: Building2, label: 'Manufacturer', value: data.manufacturer && `by ${data.manufacturer}` },
        { id: 'category', icon: Tags, label: 'Category', value: data.categoryName },
        { id: 'brand', icon: Layers, label: 'Brand', value: data.brandName },
        { id: 'pack', icon: Ruler, label: 'Pack size', value: data.packSize && `Per ${data.sellingUnit || 'pack'} of ${data.packSize}` },
        { id: 'supplier', icon: Truck, label: 'Supplier', value: data.supplierName },
        { id: 'route', icon: Route, label: 'Route', value: data.routeOfAdministration?.replaceAll('_', ' ') },
      ]
    : []

  const details = data
    ? [
        { id: 'indications', icon: Stethoscope, title: 'Indications', body: data.indications },
        { id: 'usage', icon: ClipboardList, title: 'Directions for use', body: data.dosageInstructions || data.usageInstructions },
        { id: 'storage', icon: Snowflake, title: 'Storage', body: data.storageConditions },
        { id: 'warnings', icon: AlertTriangle, title: 'Warnings', body: data.generalWarnings },
        { id: 'sideEffects', icon: Ban, title: 'Side effects', body: data.sideEffects },
        { id: 'contraindications', icon: ShieldAlert, title: 'Contraindications', body: data.contraindications },
        { id: 'ingredients', icon: FlaskConical, title: 'Active ingredients', body: data.activeIngredients },
        { id: 'care', icon: HeartPulse, title: 'Care purpose', body: data.carePurpose },
      ].filter((d) => d.body)
    : []

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <main className="content-shell pb-20 pt-24">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Link
            to="/medicines"
            className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to medicines
          </Link>
        </motion.div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8 space-y-6">
              <div className="grid gap-8 lg:grid-cols-2">
                <Skeleton className="h-[440px] rounded-[2rem]" />
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-14 w-11/12" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-40 w-full" />
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((n) => (
                      <Skeleton key={n} className="h-24 rounded-2xl" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isError ? (
            <motion.div key="error" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-16 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="mt-5 text-lg font-semibold">Medicine could not be loaded</h2>
              <p className="mt-1 text-sm text-muted-foreground">Please try refreshing the page.</p>
            </motion.div>
          ) : data ? (
            <motion.div
              key={data.id}
              variants={container}
              initial="hidden"
              animate="show"
              className="mt-8"
            >
              {/* ---------- HERO ---------- */}
              <motion.div variants={item} className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]">
                <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

                <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:p-12">
                  {/* Image */}
                  <div className="[perspective:1200px]">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, rotateY: -12 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      transition={{ ...spring, delay: 0.15 }}
                      className="group relative flex h-72 items-center justify-center overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 via-muted to-background sm:h-96"
                    >
                      {data.imageUrl ? (
                        <img
                          src={data.imageUrl}
                          alt={data.name}
                          loading="lazy"
                          className="h-full w-full object-contain p-6 transition-transform duration-700 group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-primary">
                          <Package className="h-28 w-28 transition-transform duration-700 group-hover:scale-110" />
                          <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Product visual</span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,hsl(var(--primary)/0.12)_0%,transparent_70%)]" />
                    </motion.div>
                  </div>

                  {/* Details */}
                  <div>
                    <motion.div variants={item} className="flex flex-wrap items-center gap-2">
                      <Badge className="border-transparent bg-primary/10 text-primary">{data.classification?.replaceAll('_', ' ')}</Badge>
                      {data.isControlled && <Badge color="purple">Controlled</Badge>}
                      {rx && <Badge className="border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400">Prescription required</Badge>}
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium', stock.text)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', stock.dot)} />
                        {stock.label}
                      </span>
                    </motion.div>

                    <motion.h1 variants={item} className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                      {data.name}
                    </motion.h1>

                    <motion.p variants={item} className="mt-3 text-lg text-muted-foreground">
                      {[data.genericName, data.strength, data.dosageForm].filter(Boolean).join(' · ')}
                    </motion.p>

                    <motion.p variants={item} className="mt-5 max-w-xl leading-7 text-muted-foreground">
                      {data.description || 'Product information is not currently available. Contact the pharmacy for details.'}
                    </motion.p>

                    {/* Quick info cards */}
                    <motion.div variants={item} className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:border-primary/30">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Price</p>
                        <p className="mt-1 text-lg font-semibold tracking-tight">RWF {Number(data.price).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">/ {data.sellingUnit || 'pack'}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:border-primary/30">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pack size</p>
                        <p className="mt-1 text-lg font-semibold tracking-tight">{data.packSize || 'Ask'}</p>
                        <p className="text-xs text-muted-foreground">per {data.sellingUnit || 'pack'}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:border-primary/30">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Class</p>
                        <p className="mt-1 truncate text-lg font-semibold tracking-tight">{data.classification?.replaceAll('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{data.productType || 'medicine'}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:border-primary/30">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Reviewed</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span className="text-lg font-semibold tracking-tight">Yes</span>
                        </div>
                        <p className="text-xs text-muted-foreground">by a pharmacist</p>
                      </div>
                    </motion.div>

                    {/* Actions */}
                    <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
                      {!restricted && !unavailable && !rx && (
                        <div className="inline-flex items-center rounded-xl border border-border bg-background shadow-sm">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="p-3 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Minus className="h-4 w-4" />
                          </motion.button>
                          <motion.span key={quantity} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="w-12 text-center font-semibold">
                            {quantity}
                          </motion.span>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            aria-label="Increase quantity"
                            onClick={() => setQuantity(Math.min(99, quantity + 1))}
                            className="p-3 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Plus className="h-4 w-4" />
                          </motion.button>
                        </div>
                      )}
                      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="inline-flex">
                        <Button size="lg" onClick={act} disabled={unavailable}>
                          {rx ? (
                            <>
                              <Upload className="mr-2 h-5 w-5" />
                              Upload prescription
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="mr-2 h-5 w-5" />
                              Add to cart
                            </>
                          )}
                        </Button>
                      </motion.div>
                      {restricted && (
                        <Button size="lg" variant="outline" onClick={() => navigate('/contact')}>
                          Contact pharmacy
                        </Button>
                      )}
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* ---------- KEY INFO ---------- */}
              <Reveal className="mt-12">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="mb-6 flex items-center gap-3"
                >
                  <HexIcon icon={Package} box="h-11 w-11" size="h-5 w-5" />
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Product information</h2>
                    <p className="text-sm text-muted-foreground">Everything you should know before use.</p>
                  </div>
                </motion.div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {details.map((d, i) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-30px' }}
                      transition={{ duration: 0.45, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -4 }}
                      className="group rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-center gap-3">
                        <HexIcon icon={d.icon} size="h-4 w-4" />
                        <h3 className="font-semibold">{d.title}</h3>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{d.body}</p>
                    </motion.div>
                  ))}
                </div>
              </Reveal>

              {/* ---------- SPEC SHEET ---------- */}
              {info.some((i) => i.value) && (
                <Reveal className="mt-12" delay={0.05}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-6 flex items-center gap-3"
                  >
                    <HexIcon icon={ClipboardList} box="h-11 w-11" size="h-5 w-5" />
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight">Specifications</h2>
                      <p className="text-sm text-muted-foreground">Manufacturing, packaging, and sourcing details.</p>
                    </div>
                  </motion.div>
                  <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-30px' }}
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                    className="grid gap-3 rounded-3xl border border-border/60 bg-card p-6 sm:grid-cols-2 lg:grid-cols-3 sm:p-8"
                  >
                    {info.map((row) => (
                      <motion.div
                        key={row.id}
                        variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.4 } } }}
                        className="transition-colors hover:bg-muted/40"
                      >
                        {<InfoRow {...row} />}
                      </motion.div>
                    ))}
                  </motion.div>
                </Reveal>
              )}

              {/* ---------- SAFETY FOOTER ---------- */}
              <Reveal className="mt-12" delay={0.1}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-5"
                >
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Reviewed by our pharmacists</p>
                    <p className="mt-1 leading-6">
                      This product has been reviewed and listed by a qualified pharmacist. Stock and prices may change
                      during the day. Product information is general and is not a diagnosis, personalized dose, or
                      substitute for advice from a qualified healthcare professional.
                    </p>
                  </div>
                </motion.div>
              </Reveal>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
      <PublicFooter />
    </div>
  )
}