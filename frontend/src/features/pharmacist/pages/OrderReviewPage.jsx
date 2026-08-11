import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronDown, FileText, Loader2, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

const today = () => new Date().toISOString().slice(0, 10)
const initial = {
  orderItemId: '', strength: '', dosageForm: '', dispensedQuantity: '', quantityPerDose: '1',
  doseUnit: 'capsule', route: 'oral', frequencyType: 'TWICE_DAILY', frequencyValue: '',
  administrationTimes: '08:00, 20:00', durationValue: '', durationUnit: 'DAYS', startDate: today(),
  endDate: '', foodRelationship: '', specialInstructions: '', warnings: '', storageInstructions: '',
  missedDoseInstructions: '', prescriberName: '', prescriptionReference: '',
  confirmations: { reviewedOriginal: false, medicineMatches: false, directionsCorrect: false },
}

const frequencyOptions = [
  ['ONCE_DAILY', 'Once daily'], ['TWICE_DAILY', 'Twice daily'], ['THREE_TIMES_DAILY', 'Three times daily'],
  ['FOUR_TIMES_DAILY', 'Four times daily'], ['EVERY_N_HOURS', 'Every number of hours'],
  ['AS_NEEDED', 'As needed'], ['SPECIFIC_DAYS', 'Specific days'], ['CUSTOM', 'Custom directions'],
]

function apiError(error, fallback) {
  const body = error?.response?.data
  return body?.details?.[0]?.message || body?.error || fallback
}

export default function OrderReviewPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [form, setForm] = useState(initial)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const q = useQuery({ queryKey: ['staff-order', id], queryFn: () => api.get(`/orders/${id}`).then(r => r.data.data) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['staff-order', id] })
  const o = q.data

  const selectItem = (item) => setForm(current => ({
    ...current, orderItemId: item?.id || '', strength: item?.medicine_snapshot?.strength || '',
    dosageForm: item?.medicine_snapshot?.dosageForm || '', dispensedQuantity: item?.requested_quantity || '',
    doseUnit: item?.selling_unit?.toLowerCase() || current.doseUnit,
  }))

  useEffect(() => {
    const items = o?.items?.filter(item => item.prescription_required) || []
    if (!form.orderItemId && items.length === 1) selectItem(items[0])
  }, [o, form.orderItemId])

  const transition = useMutation({
    mutationFn: status => api.post(`/orders/${id}/transition`, { status, reason }),
    onSuccess: () => { toast.success('Review status updated'); refresh() },
    onError: error => toast.error(apiError(error, 'Review could not be updated')),
  })

  const payload = () => ({
    ...form,
    dispensedQuantity: Number(form.dispensedQuantity), quantityPerDose: Number(form.quantityPerDose),
    durationValue: form.durationValue ? Number(form.durationValue) : undefined,
    frequencyValue: form.frequencyValue ? Number(form.frequencyValue) : undefined,
    endDate: form.endDate || undefined,
    administrationTimes: form.administrationTimes.split(',').map(value => value.trim()).filter(Boolean),
  })

  const validate = () => {
    if (!form.orderItemId) return 'Select the prescribed medicine.'
    if (!(Number(form.dispensedQuantity) > 0)) return 'Dispensed quantity must be greater than zero.'
    if (!(Number(form.quantityPerDose) > 0)) return 'Quantity per dose must be greater than zero.'
    if (!form.doseUnit.trim()) return 'Enter the dose unit.'
    if (!form.route.trim()) return 'Enter the administration route.'
    const expected = { ONCE_DAILY: 1, TWICE_DAILY: 2, THREE_TIMES_DAILY: 3, FOUR_TIMES_DAILY: 4 }[form.frequencyType]
    const times = form.administrationTimes.split(',').map(value => value.trim()).filter(Boolean)
    if (expected && times.length !== expected) return `${frequencyOptions.find(x => x[0] === form.frequencyType)?.[1]} requires ${expected} administration time${expected > 1 ? 's' : ''}.`
    if (!Object.values(form.confirmations).every(Boolean)) return 'Complete the three safety confirmations before saving.'
    return ''
  }

  const save = useMutation({
    mutationFn: async () => {
      const error = validate()
      if (error) throw new Error(error)
      if (o.status === 'SUBMITTED_FOR_REVIEW') {
        await api.post(`/orders/${id}/transition`, { status: 'UNDER_PHARMACIST_REVIEW' })
      }
      return api.post(`/orders/${id}/instructions`, payload())
    },
    onSuccess: () => { setFormError(''); toast.success('Directions verified and saved'); refresh() },
    onError: error => { const message = error.response ? apiError(error, 'Directions could not be saved') : error.message; setFormError(message); toast.error(message) },
  })

  const selected = o?.items?.find(item => item.id === form.orderItemId)
  const preview = useMemo(() => selected && form.quantityPerDose
    ? `Take ${form.quantityPerDose} ${form.doseUnit} by ${form.route}${form.administrationTimes ? ` at ${form.administrationTimes}` : ''}${form.durationValue ? ` for ${form.durationValue} ${form.durationUnit.toLowerCase()}` : ''}${form.foodRelationship ? `, ${form.foodRelationship.toLowerCase()}` : ''}.`
    : '', [selected, form])

  const update = (key, value) => { setFormError(''); setForm(current => ({ ...current, [key]: value })) }
  const openFile = async file => { try { const r = await api.get(`/orders/prescription-files/${file.id}`, { responseType: 'blob' }); const url = URL.createObjectURL(r.data); window.open(url, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(url), 60000) } catch { toast.error('Prescription file could not be opened securely') } }

  if (q.isLoading) return <div className="p-6">Loading secure request…</div>
  if (q.isError) return <div className="p-6">Request could not be loaded.</div>

  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm text-muted-foreground">{o.public_reference}</p><h1 className="text-3xl font-bold">Prescription review</h1></div><Badge>{o.status.replaceAll('_', ' ')}</Badge></div>
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-5">
        <Card><CardContent className="p-6"><h2 className="font-semibold">Patient and request</h2><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Patient:</span> {o.patient_name}</p><p><span className="text-muted-foreground">Verified phone:</span> {o.patient_phone}</p><p><span className="text-muted-foreground">Fulfilment:</span> {o.fulfilment_method}</p><p><span className="text-muted-foreground">Total:</span> RWF {Number(o.total).toLocaleString()}</p></div><div className="mt-5 space-y-2">{o.items.map(item => <button key={item.id} onClick={() => selectItem(item)} className={`w-full rounded-lg border p-4 text-left ${form.orderItemId === item.id ? 'border-primary bg-accent' : ''}`}><b>{item.medicine_snapshot.name}</b><p className="text-sm text-muted-foreground">{item.medicine_snapshot.strength} · Requested {item.requested_quantity} {item.selling_unit}</p></button>)}</div></CardContent></Card>
        <Card><CardContent className="p-6"><h2 className="flex items-center gap-2 font-semibold"><FileText className="h-5 w-5"/>Original prescription</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{o.prescriptionFiles.map((file, index) => <button key={file.id} onClick={() => openFile(file)} className="rounded-lg border p-4 text-left text-sm hover:border-primary">Prescription file {index + 1}<span className="mt-1 block text-xs text-muted-foreground">{file.mime_type} · {Math.round(file.byte_size / 1024)} KB</span></button>)}</div>{!o.prescriptionFiles.length && <p className="mt-4 text-sm text-destructive">No prescription is attached. Approval is blocked.</p>}</CardContent></Card>
        <Card><CardContent className="space-y-5 p-6">
          <div><h2 className="font-semibold">Verified dispensing directions</h2><p className="text-sm text-muted-foreground">Only the essential dispensing fields are required. Additional clinical notes are optional.</p></div>
          <div><Label>Medicine</Label><select className="mt-2 w-full rounded-md border bg-background p-2" value={form.orderItemId} onChange={e => selectItem(o.items.find(item => item.id === e.target.value))}><option value="">Select medicine</option>{o.items.filter(item => item.prescription_required).map(item => <option key={item.id} value={item.id}>{item.medicine_snapshot.name}</option>)}</select></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label>Strength</Label><Input className="mt-2 bg-muted" value={form.strength} readOnly/></div><div><Label>Dosage form</Label><Input className="mt-2 bg-muted" value={form.dosageForm} readOnly/></div><div><Label>Dispensed quantity</Label><Input className="mt-2" type="number" min="1" value={form.dispensedQuantity} onChange={e => update('dispensedQuantity', e.target.value)}/></div><div><Label>Quantity per dose</Label><Input className="mt-2" type="number" min="0.25" step="0.25" value={form.quantityPerDose} onChange={e => update('quantityPerDose', e.target.value)}/></div><div><Label>Dose unit</Label><Input className="mt-2" value={form.doseUnit} onChange={e => update('doseUnit', e.target.value)}/></div><div><Label>Route</Label><Input className="mt-2" value={form.route} onChange={e => update('route', e.target.value)}/></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label>Frequency</Label><select className="mt-2 w-full rounded-md border bg-background p-2" value={form.frequencyType} onChange={e => update('frequencyType', e.target.value)}>{frequencyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><Label>Administration times</Label><Input className="mt-2" value={form.administrationTimes} onChange={e => update('administrationTimes', e.target.value)} placeholder="08:00, 20:00"/></div></div>
          <details className="group rounded-xl border bg-muted/20"><summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-medium">Optional duration and patient guidance <ChevronDown className="h-4 w-4 transition group-open:rotate-180"/></summary><div className="space-y-4 border-t p-4"><div className="grid gap-4 sm:grid-cols-2"><div><Label>Duration</Label><Input className="mt-2" type="number" min="1" value={form.durationValue} onChange={e => update('durationValue', e.target.value)}/></div><div><Label>Duration unit</Label><select className="mt-2 w-full rounded-md border bg-background p-2" value={form.durationUnit} onChange={e => update('durationUnit', e.target.value)}><option>DAYS</option><option>WEEKS</option><option>MONTHS</option></select></div><div><Label>Start date</Label><Input className="mt-2" type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)}/></div><div><Label>End date</Label><Input className="mt-2" type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)}/></div></div>{[['foodRelationship','Relationship to food'],['specialInstructions','Special instructions'],['warnings','Important warnings'],['storageInstructions','Storage instructions'],['missedDoseInstructions','Missed-dose information']].map(([key,label]) => <div key={key}><Label>{label}</Label><Textarea className="mt-2" value={form[key]} onChange={e => update(key,e.target.value)}/></div>)}</div></details>
          <div className="rounded-xl border bg-accent/50 p-5"><p className="text-xs font-medium uppercase tracking-wide">Patient label preview</p><p className="mt-3 text-lg">{preview || 'Select the medicine and complete the essential directions.'}</p></div>
          <div className="space-y-3">{Object.entries({ reviewedOriginal:'I reviewed the original prescription.', medicineMatches:'The medicine and strength match.', directionsCorrect:'The quantity and directions are correct.' }).map(([key,label]) => <label key={key} className="flex cursor-pointer gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={form.confirmations[key]} onChange={e => setForm(current => ({...current, confirmations:{...current.confirmations,[key]:e.target.checked}}))}/>{label}</label>)}</div>
          {formError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving directions…</> : o.status === 'SUBMITTED_FOR_REVIEW' ? 'Begin review and save directions' : 'Verify and save directions'}</Button>
        </CardContent></Card>
      </div>
      <div className="space-y-5"><Card className="sticky top-20"><CardContent className="p-6"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="h-5 w-5"/>Decision controls</h2><Label className="mt-5 block">Reason <span className="font-normal text-muted-foreground">(only for clarification or rejection)</span></Label><Textarea className="mt-2" value={reason} onChange={e => setReason(e.target.value)} placeholder="Clear patient-facing reason"/><div className="mt-4 grid gap-2">{o.status === 'SUBMITTED_FOR_REVIEW' && <Button onClick={() => transition.mutate('UNDER_PHARMACIST_REVIEW')}>Begin review</Button>}{['UNDER_PHARMACIST_REVIEW','CLARIFICATION_REQUIRED'].includes(o.status) && <><Button onClick={() => transition.mutate('APPROVED_AWAITING_PATIENT_CONFIRMATION')}>Approve and send to patient</Button><Button variant="outline" onClick={() => transition.mutate('CLARIFICATION_REQUIRED')}>Request patient clarification</Button><Button variant="outline" onClick={() => transition.mutate('PRESCRIBER_CLARIFICATION_REQUIRED')}>Request prescriber clarification</Button><Button variant="destructive" onClick={() => transition.mutate('REJECTED_BY_PHARMACIST')}>Reject request</Button></>}{o.status === 'APPROVED_AWAITING_PAYMENT' && <Button onClick={() => transition.mutate('PAYMENT_PROCESSING')}>Begin configured payment</Button>}{o.status === 'PAYMENT_PROCESSING' && <Button onClick={() => transition.mutate('PAYMENT_RECEIVED')}>Confirm provider payment</Button>}{['PAYMENT_RECEIVED','PAYMENT_DEFERRED'].includes(o.status) && <Button onClick={() => transition.mutate('PREPARING')}>Start preparation</Button>}{o.status === 'PREPARING' && <Button onClick={() => transition.mutate(o.fulfilment_method === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY_FOR_PICKUP')}>{o.fulfilment_method === 'DELIVERY' ? 'Mark out for delivery' : 'Mark ready for pickup'}</Button>}{['READY_FOR_PICKUP','OUT_FOR_DELIVERY'].includes(o.status) && <Button onClick={() => transition.mutate('COMPLETED')}>Complete order</Button>}</div><p className="mt-4 text-xs leading-5 text-muted-foreground">Approve becomes available after verified directions are saved for each prescription medicine.</p></CardContent></Card></div>
    </div>
  </div>
}
