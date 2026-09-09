import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Search,
  Pill,
  ShieldCheck,
  ArrowRight,
  PackageSearch,
  ShoppingCart,
  Upload,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import InteractiveMedicineCard from '@/components/ui/interactive-medicine-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCartStore } from '@/stores/cartStore'

const RX_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'false', label: 'OTC' },
  { value: 'true', label: 'Rx only' },
]

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

function MedicineCard({ medicine, index, publicMode, onView, onAdd }) {
  const isRx = medicine.classification === 'PRESCRIPTION_REQUIRED' || Boolean(medicine.requiresPrescription)
  const restricted = medicine.classification === 'RESTRICTED'
  const stock = getStockStatus(medicine)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: 'easeOut' }}
      className="h-full"
    >
      <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        {/* Image / placeholder */}
        <div className="relative h-24 overflow-hidden bg-muted/50 sm:h-28">
          {medicine.imageUrl ? (
            <img
              src={medicine.imageUrl}
              alt={medicine.name}
              loading="lazy"
              className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
              <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
                <Pill className="h-8 w-8 text-primary" />
              </div>
            </div>
          )}
          <Badge
            className={cn(
              'absolute right-2 top-2 border-transparent text-[9px] shadow-sm',
              isRx
                ? 'bg-amber-500/90 text-white hover:bg-amber-500/90'
                : 'bg-emerald-500/90 text-white hover:bg-emerald-500/90'
            )}
          >
            {restricted ? 'Restricted' : isRx ? 'Rx required' : 'OTC'}
          </Badge>
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <span className={cn('h-1.5 w-1.5 rounded-full', stock.dot)} />
            {stock.label}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-3.5">
          <h3 className="truncate text-sm font-semibold tracking-tight">{medicine.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {medicine.genericName || 'No generic name'}
            {medicine.brandName ? ` · ${medicine.brandName}` : ''}
          </p>

          {(medicine.strength || medicine.dosageForm) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {medicine.strength && (
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {medicine.strength}
                </span>
              )}
              {medicine.dosageForm && (
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {medicine.dosageForm}
                </span>
              )}
            </div>
          )}

          <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
            {medicine.description || 'No description available.'}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[11px]">
              {medicine.categoryName || 'Uncategorized'}
            </Badge>
            {medicine.isControlled && (
              <Badge color="purple" className="text-[11px]">
                Controlled
              </Badge>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 border-t border-border/60 pt-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Price per {medicine.sellingUnit || 'pack'}
              </p>
              <p className="text-base font-bold tracking-tight">
                RWF {Number(medicine.price || 0).toLocaleString()}
              </p>
              <p className="max-w-36 text-[11px] text-muted-foreground">{medicine.packSize ? `Per ${medicine.sellingUnit || 'pack'} of ${medicine.packSize}` : medicine.sellingUnit || 'Per pack'}</p>
            </div>
            <div className="flex flex-col gap-1.5"><Button variant="outline" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={onView}>View <ArrowRight className="ml-1 h-3 w-3" /></Button>{publicMode&&!restricted&&stock.key!=='out'&&<Button size="sm" className="h-7 rounded-md px-2 text-xs" onClick={onAdd}>{isRx?<><Upload className="mr-1 h-3 w-3"/>Prescription</>:<><ShoppingCart className="mr-1 h-3 w-3"/>Add</>}</Button>}</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PharmacyProductCard({ medicine, index, publicMode, onView, onAdd }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.4 }} className="h-full">
      <InteractiveMedicineCard
        medicine={medicine}
        publicMode={publicMode}
        onView={onView}
        onAdd={onAdd}
        layout="stack"
        className="h-full"
      />
    </motion.div>
  )
}

function MedicineCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <Skeleton className="h-28 w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex items-center justify-between border-t pt-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default function SearchPage({ publicMode = false }) {
  const navigate = useNavigate()
  const addItem = useCartStore((state) => state.addItem)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [rxFilter, setRxFilter] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [dosageFormFilter, setDosageFormFilter] = useState('all')
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
  }, [searchParams])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const suggestionsQuery = useQuery({
    queryKey: ['search-suggestions', debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('search', debouncedSearch)
      params.set('limit', '6')
      return api.get(`/search?${params.toString()}`).then((res) => res.data)
    },
    enabled: Boolean(showSuggestions && debouncedSearch.trim().length >= 2),
    staleTime: 30_000,
  })

  const suggestions = (suggestionsQuery.data?.data || []).slice(0, 6)

  const categoriesQuery = useQuery({
    queryKey: ['public-categories'],
    queryFn: () => api.get('/inventory/categories').then((res) => res.data),
  })

  const medicinesQuery = useQuery({
    queryKey: ['app-search', debouncedSearch, categoryFilter, rxFilter, availabilityFilter, dosageFormFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter)
      if (rxFilter !== 'all') params.set('requiresPrescription', rxFilter)
      if (availabilityFilter !== 'all') params.set('availability', availabilityFilter)
      if (dosageFormFilter !== 'all') params.set('dosageForm', dosageFormFilter)
      params.set('limit', '24')
      return api.get(`/search?${params.toString()}`).then((res) => res.data)
    },
  })

  const categories = categoriesQuery.data?.data || []
  const medicines = medicinesQuery.data?.data || []

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter('all')
    setRxFilter('all')
    setAvailabilityFilter('all')
    setDosageFormFilter('all')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {publicMode ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pharmacy Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse medicines and pharmacy-care products with live pricing.
            </p>
          </div>

          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicines, brand, or category..."
              className="h-12 rounded-xl border-border/70 bg-card pl-12 pr-4 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setCategoryFilter('all')}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                  categoryFilter === 'all'
                    ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                )}
              >
                All categories
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                    categoryFilter === category.id
                      ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <div className="inline-flex shrink-0 items-center self-start rounded-xl border border-border bg-muted p-1 sm:self-auto">
              {RX_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRxFilter(option.value)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    rxFilter === option.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search medicines, categories, symptoms, and stock data.
          </p>
        </div>
      )}

      {!publicMode && (
        <Card className="rounded-2xl border-border/70 shadow-[0_1px_2px_rgb(0,0,0,0.04)]">
          <CardContent className="p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search by medicine, symptoms, barcode, or category..."
                  className="pl-10"
                />
                {showSuggestions && debouncedSearch.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                    {suggestionsQuery.isLoading ? (
                      <div className="space-y-2 p-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    ) : suggestions.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">
                        No suggestions for &quot;{debouncedSearch}&quot;
                      </p>
                    ) : (
                      <ul className="max-h-72 overflow-y-auto py-1">
                        {suggestions.map((medicine) => (
                          <li key={medicine.id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSearch(medicine.name)
                                setShowSuggestions(false)
                              }}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Pill className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{medicine.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {[medicine.genericName, medicine.strength, medicine.dosageForm]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'shrink-0 text-[10px]',
                                  medicine.classification === 'PRESCRIPTION_REQUIRED' || medicine.requiresPrescription
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                )}
                              >
                                {medicine.classification === 'PRESCRIPTION_REQUIRED' || medicine.requiresPrescription
                                  ? 'Rx'
                                  : 'OTC'}
                              </Badge>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rxFilter} onValueChange={setRxFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Prescription status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All medicines</SelectItem>
                  <SelectItem value="true">Prescription only</SelectItem>
                  <SelectItem value="false">OTC only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}><SelectTrigger><SelectValue placeholder="Availability" /></SelectTrigger><SelectContent><SelectItem value="all">All availability</SelectItem><SelectItem value="IN_STOCK">In stock</SelectItem><SelectItem value="LOW_STOCK">Low stock</SelectItem><SelectItem value="UNAVAILABLE">Unavailable</SelectItem></SelectContent></Select>
              <Select value={dosageFormFilter} onValueChange={setDosageFormFilter}><SelectTrigger><SelectValue placeholder="Dosage form" /></SelectTrigger><SelectContent><SelectItem value="all">All dosage forms</SelectItem>{['Tablet','Capsule','Delayed-release capsule','Metered-dose inhaler','Powder for oral solution'].map(form=><SelectItem key={form} value={form}>{form}</SelectItem>)}</SelectContent></Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium text-muted-foreground">
          <span className="font-bold text-foreground">{medicines.length}</span>{' '}
          {medicines.length === 1 ? 'product' : 'products'} found
        </p>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Updated from our live inventory
        </span>
      </div>

      {medicinesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <MedicineCardSkeleton key={index} />
          ))}
        </div>
      ) : medicines.length === 0 ? (
        <Card className="rounded-2xl border-border/60">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <div className="inline-flex rounded-2xl border border-border/60 bg-muted p-5">
              <PackageSearch className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">No medicines found</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try a different query or adjust the filters to see more results.
            </p>
            <Button variant="outline" size="sm" className="mt-5" onClick={resetFilters}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {medicines.map((medicine, index) => (
            <PharmacyProductCard
              key={medicine.id}
              medicine={medicine}
              index={index}
              publicMode={publicMode}
              onView={() => navigate(`/medicines/${medicine.id}`)}
              onAdd={() => { if (medicine.classification === 'PRESCRIPTION_REQUIRED' || medicine.requiresPrescription) { navigate(`/medicines/${medicine.id}/prescription`); return } addItem(medicine, 1); toast.success(`${medicine.name} added to your cart`) }}
            />
          ))}
        </div>
      )}

      {publicMode && (
        <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/40 p-5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
          <p>
            Stock and prices may change during the day. Prescription medicines are supplied only
            after a pharmacist validates an authorized prescription. Product information does not
            replace advice from a qualified healthcare professional.
          </p>
        </div>
      )}
    </motion.div>
  )
}
