import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ConfirmDialog from './ConfirmDialog'

export default function CategoryManagerDialog({ open, onOpenChange, categories }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.put(`/inventory/categories/${editing.id}`, { name, description })
        : api.post('/inventory/categories', { name, description }),
    onSuccess: () => {
      invalidate()
      toast.success(editing ? 'Category updated' : 'Category created')
      reset()
    },
    onError: (error) => setError(error.response?.data?.error || 'Unable to save category'),
  })

  const remove = useMutation({
    mutationFn: (category) => api.delete(`/inventory/categories/${category.id}`),
    onSuccess: (res) => {
      invalidate()
      toast.success(
        res.data.data?.archivedInstead
          ? 'Category is in use and was deactivated'
          : 'Category deleted'
      )
      setDeleting(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Unable to delete category')
      setDeleting(null)
    },
  })

  function reset() {
    setEditing(null)
    setName('')
    setDescription('')
    setError('')
  }

  function startEdit(category) {
    setEditing(category)
    setName(category.name)
    setDescription(category.description || '')
    setError('')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" /> Manage Categories
            </DialogTitle>
            <DialogDescription>
              Organize your product catalogue. Categories stay shared across medicines and pharmacy care.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">{editing ? `Edit "${editing.name}"` : 'Add a new category'}</p>
              <div className="space-y-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Category name, e.g. Dermatology"
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Short description (optional)"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!name.trim() || save.isPending}
                  onClick={() => save.mutate()}
                >
                  {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? 'Save changes' : 'Add category'}
                </Button>
                {editing && (
                  <Button size="sm" variant="ghost" onClick={reset}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{category.name}</p>
                    {category.description && (
                      <p className="truncate text-xs text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(category)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(category)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No categories yet. Add your first one above.
                </p>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false) }}>
              <Plus className="mr-2 h-4 w-4" /> Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(value) => !value && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="If any products use this category, it will be deactivated instead of deleted so historical records stay intact."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
