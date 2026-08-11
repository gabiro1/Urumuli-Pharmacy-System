import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, AlertTriangle, RefreshCw, Pill, Search } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const SEVERITY_OPTIONS = [
  { value: 'MILD', label: 'Mild', color: 'green' },
  { value: 'MODERATE', label: 'Moderate', color: 'yellow' },
  { value: 'SEVERE', label: 'Severe', color: 'orange' },
  { value: 'CONTRAINDICATED', label: 'Contraindicated', color: 'red' },
]

const EVIDENCE_OPTIONS = ['Established', 'Probable', 'Possible', 'Unlikely', 'Unknown']

function severityConfig(severity) {
  return SEVERITY_OPTIONS.find((option) => option.value === severity) || SEVERITY_OPTIONS[3]
}

function MedicineSelect({ label, value, onChange, excludeId }) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const suggestionsQuery = useQuery({
    queryKey: ['interaction-medicine-search', debounced],
    queryFn: () =>
      api.get(`/search?search=${encodeURIComponent(debounced)}&limit=6`).then((res) => res.data),
    enabled: debounced.length >= 2,
  })

  const options = (suggestionsQuery.data?.data || []).filter(
    (medicine) => medicine.id !== excludeId
  )

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label} *</label>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Pill className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{value.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[value.genericName, value.strength, value.dosageForm].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground"
            onClick={() => onChange(null)}
          >
            Change
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              clearTimeout(timerRef.current)
              timerRef.current = setTimeout(() => setDebounced(e.target.value), 300)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search medicine..."
            className="pl-10"
          />
          {open && debounced.length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-xl">
              {suggestionsQuery.isLoading ? (
                <div className="p-2 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              ) : options.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto py-1">
                  {options.map((medicine) => (
                    <li key={medicine.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onChange(medicine)
                          setSearch('')
                          setDebounced('')
                          setOpen(false)
                        }}
                      >
                        <Pill className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{medicine.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {medicine.genericName || 'No generic name'}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const emptyForm = {
  medicineAId: null,
  medicineBId: null,
  severity: 'MODERATE',
  description: '',
  mechanism: '',
  recommendation: '',
  evidenceLevel: '',
  source: '',
}

function RegisterInteractionDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ ...emptyForm })
  const [errors, setErrors] = useState({})

  const mutation = useMutation({
    mutationFn: (data) => api.post('/safety/interactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drug-interactions'] })
      toast.success('Interaction registered successfully')
      onOpenChange(false)
      setForm({ ...emptyForm })
      setErrors({})
    },
    onError: (err) => {
      const data = err.response?.data
      const message = data?.error || data?.message || 'Failed to register interaction'
      if (data?.details && Array.isArray(data.details)) {
        const nextErrors = {}
        for (const detail of data.details) {
          if (detail?.field) nextErrors[detail.field] = detail.message
        }
        setErrors(nextErrors)
      }
      toast.error(message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const nextErrors = {}
    if (!form.medicineAId) nextErrors.medicineAId = 'Select medicine A'
    if (!form.medicineBId) nextErrors.medicineBId = 'Select medicine B'
    if (!form.description.trim()) nextErrors.description = 'Description is required'
    if (form.medicineAId === form.medicineBId) nextErrors.medicineBId = 'Cannot be the same medicine'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    mutation.mutate({
      medicineAId: form.medicineAId,
      medicineBId: form.medicineBId,
      severity: form.severity,
      description: form.description.trim(),
      mechanism: form.mechanism.trim() || null,
      recommendation: form.recommendation.trim() || null,
      evidenceLevel: form.evidenceLevel || null,
      source: form.source.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Register Drug Interaction
          </DialogTitle>
          <DialogDescription>
            Record an interaction between two medicines in the safety library.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MedicineSelect
              label="Medicine A"
              value={form.medicineA}
              excludeId={form.medicineBId}
              onChange={(medicine) =>
                setForm((p) => ({
                  ...p,
                  medicineA: medicine,
                  medicineAId: medicine?.id ?? null,
                }))
              }
            />
            <MedicineSelect
              label="Medicine B"
              value={form.medicineB}
              excludeId={form.medicineAId}
              onChange={(medicine) =>
                setForm((p) => ({
                  ...p,
                  medicineB: medicine,
                  medicineBId: medicine?.id ?? null,
                }))
              }
            />
          </div>
          {(errors.medicineAId || errors.medicineBId) && (
            <p className="text-xs text-destructive">
              {errors.medicineAId || errors.medicineBId}
            </p>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Severity *</label>
            <Select value={form.severity} onValueChange={(v) => setForm((p) => ({ ...p, severity: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="e.g. Increased risk of gastrointestinal bleeding"
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mechanism</label>
              <Input
                value={form.mechanism}
                onChange={(e) => setForm((p) => ({ ...p, mechanism: e.target.value }))}
                placeholder="e.g. Additive anticoagulant effect"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Evidence Level</label>
              <Select
                value={form.evidenceLevel || 'none'}
                onValueChange={(v) => setForm((p) => ({ ...p, evidenceLevel: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select evidence level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {EVIDENCE_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Recommendation</label>
            <Textarea
              rows={2}
              value={form.recommendation}
              onChange={(e) => setForm((p) => ({ ...p, recommendation: e.target.value }))}
              placeholder="e.g. Monitor closely or avoid combination"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Source</label>
            <Input
              value={form.source}
              onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
              placeholder="e.g. British National Formulary"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Register Interaction'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteInteractionDialog({ interaction, open, onOpenChange }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => api.delete(`/safety/interactions/${interaction.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drug-interactions'] })
      toast.success('Interaction removed')
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to remove interaction')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Remove Interaction
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove the interaction between{' '}
            <span className="font-medium">{interaction?.medicine_a_name}</span> and{' '}
            <span className="font-medium">{interaction?.medicine_b_name}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              'Remove'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function InteractionLibrary() {
  const user = useAuthStore((state) => state.user)
  const canManage = ['ADMIN', 'MANAGER', 'PHARMACIST'].includes(user?.role)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['drug-interactions'],
    queryFn: () =>
      api.get('/safety/interactions', { params: { limit: 100 } }).then((res) => res.data?.data || []),
  })

  const interactions = data || []

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            Interaction Library
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Register
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {error.response?.data?.error || 'Failed to load interactions'}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : interactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-muted">
                <Pill className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No interactions registered</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                The drug checker uses this library to flag risky combinations.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine A</TableHead>
                    <TableHead>Medicine B</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interactions.map((interaction) => {
                    const config = severityConfig(interaction.severity)
                    return (
                      <TableRow key={interaction.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium whitespace-nowrap">
                          {interaction.medicine_a_name}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {interaction.medicine_b_name}
                        </TableCell>
                        <TableCell>
                          <Badge color={config.color} className="text-xs font-medium px-3 py-1">
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm line-clamp-2 max-w-[320px]">
                            {interaction.description}
                          </p>
                          {interaction.evidence_level && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Evidence: {interaction.evidence_level}
                            </p>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(interaction)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RegisterInteractionDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      <DeleteInteractionDialog
        interaction={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </>
  )
}
