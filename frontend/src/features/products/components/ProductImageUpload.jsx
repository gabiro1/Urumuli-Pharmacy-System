import { useRef, useState } from 'react'
import { UploadCloud, ImagePlus, RefreshCw, X, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { validateImageFile } from '../productUtils'

export function ProductImageUpload({ value, onChange }) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const preview = value?.previewUrl || value?.existingUrl || null

  function handleFile(file) {
    if (!file) return
    const validation = validateImageFile(file)
    if (validation) {
      setError(validation)
      return
    }
    setError(null)
    onChange({
      file,
      previewUrl: URL.createObjectURL(file),
      existingUrl: null,
      removeExisting: false,
    })
  }

  function handleRemove() {
    if (value?.file) URL.revokeObjectURL(value.previewUrl)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border',
          error && 'border-destructive'
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={preview}
              alt="Product preview"
              className="h-40 w-full max-w-[220px] rounded-md border bg-muted object-contain p-2"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Replace
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={handleRemove}>
                <X className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          </div>
        ) : (
          <>
            <span className="rounded-full bg-primary/10 p-3 text-primary">
              <UploadCloud className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drag &amp; drop an image, or{' '}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => inputRef.current?.click()}
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG or WEBP · up to 5 MB
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" /> Upload image
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {!preview && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5" /> A professional placeholder will be shown until an image is uploaded.
        </p>
      )}
    </div>
  )
}
