import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  List,
  Package,
  Pill,
  Plus,
  Search,
  Sparkles,
  Tags,
  X,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
// Card/CardContent still used in empty state and list view
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ProductCard from '@/features/products/components/ProductCard'
import ProductTable from '@/features/products/components/ProductTable'
import ProductFormDialog from '@/features/products/components/ProductFormDialog'
import ProductDetailDialog from '@/features/products/components/ProductDetailDialog'
import ProductStockDialog from '@/features/products/components/ProductStockDialog'
import FiltersPanel, { EMPTY_FILTERS, countActiveFilters } from '@/features/products/components/FiltersPanel'
import CategoryManagerDialog from '@/features/products/components/CategoryManagerDialog'
import ConfirmDialog from '@/features/products/components/ConfirmDialog'
import { buildQuery, canManageProducts } from '@/features/products/productUtils'
import { SORT_OPTIONS } from '@/features/products/productConstants'
import { useAuthStore } from '@/stores/authStore'

const PAGE_SIZE = 24

function StatCard({ icon: Icon, label, value, variant, onClick }) {
  const colors = {
    primary: 'text-primary bg-primary/10',
    success: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40',
    danger: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40',
    info: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40',
  }
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'rounded-xl border border-border/60 bg-card p-4 text-left transition-colors',
        onClick && 'cursor-pointer hover:border-primary/40 hover:bg-accent/30'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className={cn('rounded-md p-1.5', colors[variant])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value ?? '—'}</p>
    </Wrapper>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <Skeleton key={index} className="w-full rounded-xl" style={{ aspectRatio: '4/3' }} />
      ))}
    </div>
  )
}

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [searchParams] = useSearchParams()
  const manage = canManageProducts(user?.role)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [type, setType] = useState('ALL')
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
  const [sort, setSort] = useState('name_ASC')
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(1)

  const [editor, setEditor] = useState({ open: false, product: null, defaultType: 'MEDICINE' })
  const [detailProduct, setDetailProduct] = useState(null)
  const [stockProduct, setStockProduct] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const typeParam = searchParams.get('type')
    const stockStatus = searchParams.get('stockStatus')
    const expiry = searchParams.get('expiry')
    const q = searchParams.get('q')
    if (typeParam) setType(typeParam.toUpperCase())
    if (q) setSearch(q)
    setFilters((prev) => ({
      ...prev,
      stockStatus: stockStatus ? stockStatus.toUpperCase() : prev.stockStatus,
      expiry: expiry ? expiry.toUpperCase() : prev.expiry,
    }))
    if (searchParams.get('new')) {
      setEditor({ open: true, product: null, defaultType: typeParam === 'PHARMACY_CARE' ? 'PHARMACY_CARE' : 'MEDICINE' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, type, filters, sort])

  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => api.get('/inventory/categories').then((res) => res.data.data || []),
  })
  const suppliersQuery = useQuery({
    queryKey: ['product-suppliers'],
    queryFn: () => api.get('/inventory/suppliers').then((res) => res.data.data || []),
  })
  const summaryQuery = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => api.get('/inventory/summary').then((res) => res.data.data || {}),
  })

  const queryString = useMemo(() => {
    const [sortBy, sortOrder] = sort.split('_')
    return buildQuery({
      search: debouncedSearch || null,
      productType: type,
      categoryId: filters.categoryId,
      stockStatus: filters.stockStatus,
      requiresPrescription: filters.prescription === 'REQUIRED' ? true : filters.prescription === 'OTC' ? false : null,
      expiry: filters.expiry,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      brand: filters.brand,
      supplierId: filters.supplierId,
      sortBy,
      sortOrder,
      page,
      limit: PAGE_SIZE,
    })
  }, [debouncedSearch, type, filters, sort, page])

  const productsQuery = useQuery({
    queryKey: ['products', queryString],
    queryFn: () => api.get(`/inventory/products?${queryString}`).then((res) => res.data),
    keepPreviousData: true,
  })

  const categories = categoriesQuery.data || []
  const suppliers = suppliersQuery.data || []
  const summary = summaryQuery.data || {}
  const products = productsQuery.data?.data || []
  const meta = productsQuery.data?.meta || {}
  const activeFilterCount = countActiveFilters({ ...filters, productType: type })
  const hasAnyFilter = activeFilterCount > 0 || debouncedSearch

  const archiveMutation = useMutation({
    mutationFn: (product) => api.patch(`/inventory/products/${product.id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      toast.success('Product archived')
      setArchiveTarget(null)
      setDetailProduct(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Unable to archive product')
      setArchiveTarget(null)
    },
  })

  function openAdd(defaultType = 'MEDICINE') {
    setEditor({ open: true, product: null, defaultType })
  }
  function openEdit(product) {
    setDetailProduct(null)
    setEditor({ open: true, product, defaultType: product.productType })
  }
  function clearFilters() {
    setType('ALL')
    setFilters({ ...EMPTY_FILTERS })
    setPage(1)
  }
  function applyFilters(applied) {
    const { productType, ...rest } = applied
    setType(productType === 'ALL' ? 'ALL' : productType)
    setFilters(rest)
    setPage(1)
  }

  const goToStat = (params) => {
    setFilters((prev) => ({ ...prev, ...params }))
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Catalog &amp; inventory</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Products</h1>
          <p className="mt-1 text-muted-foreground">
            Manage medicines, pharmacy cosmetics, personal-care products and inventory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {manage && (
            <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
              <Tags className="mr-2 h-4 w-4" /> Categories
            </Button>
          )}
          {manage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openAdd('MEDICINE')}>Add Medicine</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openAdd('PHARMACY_CARE')}>
                  Add Pharmacy Care Product
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Package} label="Total products" value={summary.totalProducts} variant="primary" onClick={() => clearFilters()} />
        <StatCard icon={Pill} label="Medicines" value={summary.medicines} variant="info" onClick={() => { setType('MEDICINE'); setPage(1) }} />
        <StatCard icon={Sparkles} label="Pharmacy care" value={summary.pharmacyCare} variant="info" onClick={() => { setType('PHARMACY_CARE'); setPage(1) }} />
        <StatCard icon={AlertTriangle} label="Low stock" value={summary.lowStock} variant="warning" onClick={() => goToStat({ stockStatus: 'LOW_STOCK' })} />
        <StatCard icon={AlertTriangle} label="Out of stock" value={summary.outOfStock} variant="danger" onClick={() => goToStat({ stockStatus: 'OUT_OF_STOCK' })} />
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-10 items-center gap-1 rounded-md bg-muted p-1 text-muted-foreground">
          {[
            { value: 'ALL', label: 'All' },
            { value: 'MEDICINE', label: 'Medicines' },
            { value: 'PHARMACY_CARE', label: 'Pharmacy Care' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setType(tab.value); setPage(1) }}
              className={cn(
                'rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
                type === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, generic, SKU, brand…"
              className="w-56 pl-9 sm:w-64"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <FiltersPanel
            filters={{ ...filters, productType: type }}
            onChange={applyFilters}
            onClear={clearFilters}
            categories={categories}
            suppliers={suppliers}
            activeCount={activeFilterCount}
          />

          {/* Sort */}
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="inline-flex h-10 items-center rounded-md border bg-card p-1">
            <button
              onClick={() => setView('grid')}
              className={cn('rounded p-1.5 transition-colors', view === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="Grid view"
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('rounded p-1.5 transition-colors', view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{meta.total ?? 0} results</span>
          {type !== 'ALL' && <Badge variant="secondary">{type === 'MEDICINE' ? 'Medicines' : 'Pharmacy Care'}</Badge>}
          {filters.stockStatus !== 'ALL' && (
            <Badge variant="secondary">{filters.stockStatus.split('_').join(' ')}</Badge>
          )}
          {filters.expiry !== 'ALL' && <Badge variant="secondary">{filters.expiry.split('_').join(' ')}</Badge>}
          {filters.prescription !== 'ALL' && (
            <Badge variant="secondary">{filters.prescription === 'REQUIRED' ? 'Prescription required' : 'OTC'}</Badge>
          )}
          {filters.categoryId && (
            <Badge variant="secondary">{categories.find((c) => c.id === filters.categoryId)?.name}</Badge>
          )}
          {filters.brand && <Badge variant="secondary">{filters.brand}</Badge>}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" /> Clear all
          </Button>
        </div>
      )}

      {/* Content */}
      {productsQuery.isLoading || productsQuery.isFetching ? (
        view === 'grid' ? <SkeletonGrid /> : <Skeleton className="h-64 w-full rounded-xl" />
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            {hasAnyFilter ? (
              <>
                <Package className="h-10 w-10 text-muted-foreground/60" />
                <div>
                  <p className="font-medium">No products match your filters.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try adjusting or clearing the filters.</p>
                </div>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </>
            ) : (
              <>
                <Package className="h-10 w-10 text-muted-foreground/60" />
                <div>
                  <p className="font-medium">No products found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try changing your filters or add your first pharmacy product.
                  </p>
                </div>
                {manage && <Button onClick={() => openAdd('MEDICINE')}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>}
              </>
            )}
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onView={() => setDetailProduct(product)}
              onEdit={() => openEdit(product)}
              onAdjust={() => setStockProduct(product)}
              onArchive={() => setArchiveTarget(product)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ProductTable
              products={products}
              onView={() => {}}
              onEdit={openEdit}
              onAdjust={setStockProduct}
              onArchive={setArchiveTarget}
            />
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} products
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (meta.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {manage && (
        <ProductFormDialog
          open={editor.open}
          onOpenChange={(open) => setEditor((prev) => ({ ...prev, open }))}
          product={editor.product}
          categories={categories}
          suppliers={suppliers}
          defaultType={editor.defaultType}
        />
      )}
      <ProductDetailDialog
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onEdit={() => openEdit(detailProduct)}
        onAdjust={() => setStockProduct(detailProduct)}
        onArchive={() => setArchiveTarget(detailProduct)}
      />
      {stockProduct && (
        <ProductStockDialog
          product={stockProduct}
          open={Boolean(stockProduct)}
          onOpenChange={(open) => !open && setStockProduct(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive ${archiveTarget?.name ? `"${archiveTarget.name}"` : 'product'}?`}
        description="This product will no longer appear in active product listings, but historical records will be preserved."
        confirmLabel="Archive"
        destructive
        loading={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget)}
      />
      {manage && (
        <CategoryManagerDialog
          open={categoriesOpen}
          onOpenChange={setCategoriesOpen}
          categories={categories}
        />
      )}
    </div>
  )
}
