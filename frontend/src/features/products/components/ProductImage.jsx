import { useState } from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProductImage({ src, alt, className, iconClassName, imgClassName }) {
  const [error, setError] = useState(false)
  const showImage = src && !error

  return (
    <div className={cn('grid place-items-center overflow-hidden bg-muted/40', className)}>
      {showImage ? (
        <img
          src={src}
          alt={alt || 'Product'}
          loading="lazy"
          className={cn('h-full w-full object-contain', imgClassName)}
          onError={() => setError(true)}
        />
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground/60">
          <Package className={cn('h-6 w-6', iconClassName)} />
        </span>
      )}
    </div>
  )
}
