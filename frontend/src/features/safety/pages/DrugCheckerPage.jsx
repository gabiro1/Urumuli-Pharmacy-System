import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Search, ShieldCheck, AlertTriangle, XCircle, Loader2, X } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import InteractionLibrary from '../components/InteractionLibrary'

function riskColor(riskLevel) {
  const colors = {
    HIGH: 'red',
    MODERATE: 'yellow',
    LOW: 'green',
    NONE: 'green',
  }
  return colors[riskLevel] || 'default'
}

export default function DrugCheckerPage() {
  const [medicineSearch, setMedicineSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedMedicines, setSelectedMedicines] = useState([])
  const [patientPhone, setPatientPhone] = useState('')
  const [allergies, setAllergies] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(medicineSearch), 300)
    return () => clearTimeout(timer)
  }, [medicineSearch])

  const suggestionsQuery = useQuery({
    queryKey: ['drug-checker-search', debouncedSearch],
    queryFn: () => api.get(`/search?search=${encodeURIComponent(debouncedSearch)}&limit=8`).then((res) => res.data),
    enabled: debouncedSearch.length >= 2,
  })

  const selectedIds = useMemo(() => selectedMedicines.map((medicine) => medicine.id), [selectedMedicines])

  const checkMutation = useMutation({
    mutationFn: () => api.post('/safety/drug-checker', {
      medicineIds: selectedIds,
      patientPhone,
      allergies,
    }),
    onSuccess: (response) => {
      setResult(response.data.data)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to run drug check')
    },
  })

  const addMedicine = (medicine) => {
    setSelectedMedicines((current) => (
      current.some((item) => item.id === medicine.id)
        ? current
        : [...current, medicine]
    ))
    setMedicineSearch('')
    setDebouncedSearch('')
  }

  const removeMedicine = (medicineId) => {
    setSelectedMedicines((current) => current.filter((medicine) => medicine.id !== medicineId))
  }

  const submitCheck = () => {
    if (selectedMedicines.length === 0) {
      toast.error('Select at least one medicine first')
      return
    }
    checkMutation.mutate()
  }

  const warnings = result?.warnings || []
  const interactions = result?.interactions || []
  const patientAllergies = result?.patientAllergies || []
  const manualAllergies = result?.manualAllergies || []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Drug Checker</h1>
        <p className="text-muted-foreground mt-1">Check interactions, allergies, and contraindications before dispensing.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              Select Medicines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={medicineSearch}
                onChange={(e) => setMedicineSearch(e.target.value)}
                placeholder="Search medicines to add..."
                className="pl-10"
              />
            </div>

            {debouncedSearch.length >= 2 && (
              <Card className="border-dashed">
                <CardContent className="p-0">
                  {suggestionsQuery.isLoading ? (
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (suggestionsQuery.data?.data || []).length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      No matches for "{debouncedSearch}".
                    </div>
                  ) : (
                    <ScrollArea className="max-h-64">
                      <div className="divide-y">
                        {(suggestionsQuery.data?.data || []).map((medicine) => (
                          <button
                            key={medicine.id}
                            type="button"
                            onClick={() => addMedicine(medicine)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{medicine.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {medicine.generic_name || medicine.genericName || 'No generic name'} - Stock {medicine.currentStock ?? medicine.current_stock ?? 0}
                              </p>
                            </div>
                            <Badge color={medicine.requires_prescription || medicine.requiresPrescription ? 'yellow' : 'green'}>
                              {(medicine.requires_prescription || medicine.requiresPrescription) ? 'Rx' : 'OTC'}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Selected medicines</p>
              {selectedMedicines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medicines selected yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedMedicines.map((medicine) => (
                    <Badge key={medicine.id} className="gap-1.5 px-3 py-1.5" color="blue">
                      {medicine.name}
                      <button
                        type="button"
                        onClick={() => removeMedicine(medicine.id)}
                        className="rounded-full p-0.5 hover:bg-white/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Patient Phone</label>
              <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="Optional phone number" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Known Allergies</label>
              <Textarea
                rows={5}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Comma separated allergies, e.g. penicillin, aspirin"
              />
            </div>
            <Button className="w-full" onClick={submitCheck} disabled={checkMutation.isPending}>
              {checkMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Check Interactions
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Run a check to see interaction and allergy risk.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge color={riskColor(result.riskLevel)} className="px-3 py-1.5">
                    Risk: {result.riskLevel}
                  </Badge>
                  <Badge color={result.safe ? 'green' : 'red'}>{result.safe ? 'Safe to dispense' : 'Review required'}</Badge>
                  <span className="text-sm text-muted-foreground">{selectedMedicines.length} medicines checked</span>
                </div>

                {warnings.length === 0 ? (
                  <div className="rounded-lg border border-green-200 bg-green-50/70 dark:border-green-900 dark:bg-green-950/30 p-4 text-sm text-green-700 dark:text-green-300">
                    No interactions or allergy warnings were detected.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {warnings.map((warning, index) => (
                      <div
                        key={`${warning.type}-${index}`}
                        className={cn(
                          'rounded-lg border p-4',
                          warning.severity === 'HIGH' || warning.severity === 'SEVERE' || warning.severity === 'CONTRAINDICATED'
                            ? 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30'
                            : 'border-yellow-200 bg-yellow-50/70 dark:border-yellow-900 dark:bg-yellow-950/30'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {warning.type === 'INTERACTION' ? (
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge color={warning.type === 'INTERACTION' ? 'red' : 'yellow'}>
                                {warning.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">Severity: {warning.severity}</span>
                            </div>
                            <p className="text-sm font-medium">
                              {warning.message}
                            </p>
                            {warning.recommendation && (
                              <p className="text-xs text-muted-foreground">
                                Recommendation: {warning.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selected Medicines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedMedicines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medicines selected.</p>
              ) : (
                selectedMedicines.map((medicine) => (
                  <div key={medicine.id} className="rounded-lg border p-3">
                    <p className="font-medium">{medicine.name}</p>
                    <p className="text-xs text-muted-foreground">{medicine.generic_name || medicine.genericName || 'No generic name'}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Patient Allergies</p>
                <p>{patientAllergies.length || manualAllergies.length ? `${patientAllergies.length} stored, ${manualAllergies.length} manual` : 'None reported'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Interactions</p>
                <p>{interactions.length} pairwise interactions found</p>
              </div>
              {selectedMedicines.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Checked IDs</p>
                  <p className="text-xs font-mono break-all">{selectedMedicines.map((medicine) => medicine.id).join(', ')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <InteractionLibrary />
    </motion.div>
  )
}
