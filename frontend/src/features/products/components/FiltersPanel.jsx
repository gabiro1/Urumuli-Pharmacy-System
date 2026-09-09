import { useEffect, useState } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { PRODUCT_TYPES, STOCK_STATUS_OPTIONS, PRESCRIPTION_OPTIONS, EXPIRY_OPTIONS } from '../productConstants'

export const EMPTY_FILTERS = {
  productType: 'ALL',
  categoryId: '',
  stockStatus: 'ALL',
  prescription: 'ALL',
  expiry: 'ALL',
  minPrice: '',
  maxPrice: '',
  brand: '',
  supplierId: '',
}

export function countActiveFilters(filters) {
  return Object.values(filters).filter((value) => value !== '' && value !== 'ALL').length
}

export default function FiltersPanel({ filters, onChange, onClear, categories, suppliers, activeCount }) {
  const [draft, setDraft] = useState({ ...EMPTY_FILTERS, ...filters })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) setDraft({ ...EMPTY_FILTERS, ...filters })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-[10px]">{activeCount}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Filters</p>
          <button
            onClick={() => {
              setDraft({ ...EMPTY_FILTERS })
              onClear()
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Clear all
          </button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Product type</Label>
          <Select value={draft.productType || 'ALL'} onValueChange={(value) => set('productType', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All products</SelectItem>
              {PRODUCT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Category</Label>
          <Select value={draft.categoryId || 'ALL'} onValueChange={(value) => set('categoryId', value === 'ALL' ? '' : value)}>
            <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Stock status</Label>
            <Select value={draft.stockStatus} onValueChange={(value) => set('stockStatus', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {STOCK_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Prescription</Label>
            <Select value={draft.prescription} onValueChange={(value) => set('prescription', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {PRESCRIPTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Expiry</Label>
            <Select value={draft.expiry} onValueChange={(value) => set('expiry', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Supplier</Label>
            <Select value={draft.supplierId || 'ALL'} onValueChange={(value) => set('supplierId', value === 'ALL' ? '' : value)}>
              <SelectTrigger><SelectValue placeholder="All suppliers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Brand</Label>
            <Input value={draft.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. CeraVe" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Min price</Label>
              <Input type="number" min="0" value={draft.minPrice} onChange={(e) => set('minPrice', e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Max price</Label>
              <Input type="number" min="0" value={draft.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} placeholder="∞" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft({ ...EMPTY_FILTERS })
              onClear()
            }}
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onChange(draft)
              setOpen(false)
            }}
          >
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
