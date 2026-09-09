import { Eye, Pencil, Archive, PackageMinus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ProductImage } from './ProductImage'
import { StatusBadge } from './ProductCard'
import { money, stockState, expiryState, productTypeLabel, formatDateOnly } from '../productUtils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ProductTable({ products, onView, onEdit, onAdjust, onArchive }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Image</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const stock = stockState(product)
            const expiry = expiryState(product)
            return (
              <TableRow key={product.id} className={cn(product.isArchived && 'opacity-60')}>
                <TableCell>
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-10 w-10 rounded-md border"
                    iconClassName="h-4 w-4"
                  />
                </TableCell>
                <TableCell>
                  <div className="max-w-[220px] space-y-0.5">
                    <p className="truncate font-medium" title={product.name}>
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.genericName || product.carePurpose || product.brandName || '—'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {productTypeLabel(product.productType)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[140px] truncate">
                  {product.categoryName || '—'}
                </TableCell>
                <TableCell className="font-mono text-xs">{product.sku || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{money(product.price)}</TableCell>
                <TableCell className="text-right tabular-nums">{product.currentStock}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge state={stock} />
                    {expiry && <StatusBadge state={expiry} />}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatDateOnly(product.expiryDate)}
                </TableCell>
                <TableCell className="max-w-[120px] truncate">{product.supplierName || '—'}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateOnly(product.updatedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onView(product)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(product)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 px-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onAdjust(product)}>
                          <PackageMinus className="mr-2 h-4 w-4" /> Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => onArchive(product)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" /> Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
