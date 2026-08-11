import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  ArrowLeft,
  Plus,
  X,
  Pill,
  Loader2,
  FileText,
  Upload,
  Trash2,
  AlertCircle,
  Check,
  ChevronsUpDown,
  Search,
} from 'lucide-react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const medicineSchema = z.object({
  medicineId: z.string().min(1, 'Medicine is required'),
  name: z.string().min(1, 'Name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  notes: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
})

const prescriptionSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required'),
  patientPhone: z.string().min(1, 'Phone number is required'),
  patientDOB: z.string().optional(),
  patientAllergies: z.string().optional(),
  prescriberName: z.string().min(1, 'Prescriber name is required'),
  prescriberLicense: z.string().optional(),
  urgency: z.enum(['NORMAL', 'URGENT', 'STAT']),
  notes: z.string().optional(),
  medicines: z.array(medicineSchema).min(1, 'At least one medicine is required'),
})

export default function CreatePrescriptionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [medicineSearchOpen, setMedicineSearchOpen] = useState(false)
  const [medicineSearch, setMedicineSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)

  const form = useForm({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientName: '',
      patientPhone: '',
      patientDOB: '',
      patientAllergies: '',
      prescriberName: '',
      prescriberLicense: '',
      urgency: 'NORMAL',
      notes: '',
      medicines: [],
    },
  })

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'medicines' })

  const medicinesWatcher = watch('medicines')

  const { data: inventoryData } = useQuery({
    queryKey: ['medicines-search', medicineSearch],
    queryFn: () => api.get(`/inventory/medicines?search=${encodeURIComponent(medicineSearch)}&limit=20`).then((r) => r.data),
    enabled: medicineSearch.length > 0,
  })

  const inventoryMedicines = inventoryData?.data?.medicines || inventoryData?.data || []

  const createMutation = useMutation({
    mutationFn: (formData) => {
      const payload = new FormData()
      payload.append('patientName', formData.patientName)
      payload.append('patientPhone', formData.patientPhone)
      if (formData.patientDOB) payload.append('patientDOB', formData.patientDOB)
      payload.append('patientAllergies', formData.patientAllergies || '')
      payload.append('prescriberName', formData.prescriberName)
      if (formData.prescriberLicense) payload.append('prescriberLicense', formData.prescriberLicense)
      payload.append('urgency', formData.urgency)
      payload.append('notes', formData.notes || '')
      payload.append('medicines', JSON.stringify(formData.medicines.map((m) => ({
        medicineId: m.medicineId,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        notes: m.notes || '',
        quantity: m.quantity,
      }))))
      if (selectedFile) {
        payload.append('image', selectedFile)
      }
      return api.post('/prescriptions', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      toast.success('Prescription created successfully')
      navigate('/app/prescriptions')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to create prescription'))
    },
  })

  const onSubmit = (values) => {
    createMutation.mutate(values)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => setFilePreview(ev.target?.result)
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }

  const addMedicineFromInventory = (medicine) => {
    append({
      medicineId: medicine.id || medicine._id,
      name: medicine.name,
      dosage: '',
      frequency: '',
      duration: '',
      notes: '',
      quantity: 1,
    })
    setMedicineSearchOpen(false)
    setMedicineSearch('')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/prescriptions')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Prescription</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter prescription details and add medicines
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Patient Information</CardTitle>
                <CardDescription>Enter the patient's personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientName">Patient Name *</Label>
                    <Input
                      id="patientName"
                      placeholder="Enter patient name"
                      {...register('patientName')}
                    />
                    {errors.patientName && (
                      <p className="text-xs text-destructive">{errors.patientName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patientPhone">Phone Number *</Label>
                    <Input
                      id="patientPhone"
                      placeholder="Enter phone number"
                      {...register('patientPhone')}
                    />
                    {errors.patientPhone && (
                      <p className="text-xs text-destructive">{errors.patientPhone.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientDOB">Date of Birth</Label>
                    <Input
                      id="patientDOB"
                      type="date"
                      {...register('patientDOB')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patientAllergies">Allergies</Label>
                    <Input
                      id="patientAllergies"
                      placeholder="e.g., Penicillin, Aspirin (comma separated)"
                      {...register('patientAllergies')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Medicines</CardTitle>
                    <CardDescription>Add prescribed medicines to the prescription</CardDescription>
                  </div>
                  <Popover open={medicineSearchOpen} onOpenChange={setMedicineSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Medicine
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="end">
                      <Command>
                        <CommandInput
                          placeholder="Search medicines..."
                          value={medicineSearch}
                          onValueChange={setMedicineSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {medicineSearch.length === 0
                              ? 'Type to search medicines'
                              : 'No medicines found'}
                          </CommandEmpty>
                          <CommandGroup heading="Inventory">
                            {inventoryMedicines.map((med) => (
                              <CommandItem
                                key={med.id || med._id}
                                value={med.name}
                                onSelect={() => addMedicineFromInventory(med)}
                              >
                                <Pill className="w-4 h-4 mr-2 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{med.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {med.category || 'Uncategorized'} &middot; {med.quantity || 0} in stock
                                  </p>
                                </div>
                                <Check className="w-4 h-4 ml-2 text-primary opacity-0" />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Pill className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No medicines added yet. Click "Add Medicine" to search and add.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Pill className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{medicinesWatcher?.[index]?.name || 'Medicine'}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Dosage *</Label>
                            <Input
                              placeholder="e.g., 500mg"
                              {...register(`medicines.${index}.dosage`)}
                            />
                            {errors.medicines?.[index]?.dosage && (
                              <p className="text-xs text-destructive">{errors.medicines[index].dosage.message}</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Frequency *</Label>
                            <Input
                              placeholder="e.g., Twice daily"
                              {...register(`medicines.${index}.frequency`)}
                            />
                            {errors.medicines?.[index]?.frequency && (
                              <p className="text-xs text-destructive">{errors.medicines[index].frequency.message}</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Duration *</Label>
                            <Input
                              placeholder="e.g., 7 days"
                              {...register(`medicines.${index}.duration`)}
                            />
                            {errors.medicines?.[index]?.duration && (
                              <p className="text-xs text-destructive">{errors.medicines[index].duration.message}</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Quantity *</Label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="1"
                              {...register(`medicines.${index}.quantity`)}
                            />
                            {errors.medicines?.[index]?.quantity && (
                              <p className="text-xs text-destructive">{errors.medicines[index].quantity.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <Input
                            placeholder="Notes (optional)"
                            {...register(`medicines.${index}.notes`)}
                          />
                        </div>
                      </motion.div>
                    ))}
                    {errors.medicines && !Array.isArray(errors.medicines) && (
                      <p className="text-xs text-destructive">{errors.medicines.message}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Upload Prescription Image</CardTitle>
                <CardDescription>Upload a photo or scan of the physical prescription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                  {selectedFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { setSelectedFile(null); setFilePreview(null) }}
                      className="text-destructive shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {filePreview && (
                  <div className="mt-4 rounded-lg overflow-hidden border">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-full h-40 object-contain bg-muted/30"
                    />
                  </div>
                )}
                {selectedFile && !filePreview && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{selectedFile.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Prescription Details</CardTitle>
                <CardDescription>Prescriber info and urgency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prescriberName">Prescriber Name *</Label>
                  <Input
                    id="prescriberName"
                    placeholder="Doctor's name"
                    {...register('prescriberName')}
                  />
                  {errors.prescriberName && (
                    <p className="text-xs text-destructive">{errors.prescriberName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prescriberLicense">License Number</Label>
                  <Input
                    id="prescriberLicense"
                    placeholder="License #"
                    {...register('prescriberLicense')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency *</Label>
                  <Select
                    defaultValue="NORMAL"
                    onValueChange={(v) => setValue('urgency', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                      <SelectItem value="STAT">Stat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes..."
                    className="min-h-[80px]"
                    {...register('notes')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Create Prescription
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 mt-3"
                  onClick={() => navigate('/app/prescriptions')}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
