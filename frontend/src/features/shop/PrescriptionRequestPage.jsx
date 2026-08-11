import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileCheck2, FileText, ShieldCheck, Upload, X } from 'lucide-react'
import api from '@/lib/api'
import PublicNavbar from '@/components/shared/PublicNavbar'
import { useCartStore } from '@/stores/cartStore'
import { usePrescriptionDraftStore } from '@/stores/prescriptionDraftStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function PrescriptionRequestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore((state) => state.addItem)
  const setDraft = usePrescriptionDraftStore((state) => state.setDraft)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const medicineQuery = useQuery({ queryKey: ['prescription-medicine', id], queryFn: () => api.get(`/inventory/medicines/${id}`).then((r) => r.data.data) })

  const selectFiles = (selected) => {
    const next = [...selected]
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic', '.heif', '.pdf', '.doc', '.docx', '.odt']
    if (next.length > 3) return setError('You can upload a maximum of 3 files.')
    if (next.some((file) => !allowed.includes(file.type) && !allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext)))) return setError('Choose a supported image, PDF, or document file.')
    if (next.some((file) => file.size > 10 * 1024 * 1024)) return setError('Each file must be 10 MB or smaller.')
    setError('')
    setFiles(next)
  }
  const continueRequest = () => {
    if (!files.length) return setError('Choose at least one prescription file before continuing.')
    addItem(medicineQuery.data, 1)
    setDraft(id, files)
    navigate('/checkout')
  }

  if (medicineQuery.isLoading) return <div className="min-h-screen bg-muted/20"><PublicNavbar /><main className="mx-auto max-w-5xl px-4 pt-28"><Skeleton className="h-[520px] rounded-3xl" /></main></div>
  if (medicineQuery.isError) return <div className="min-h-screen bg-muted/20"><PublicNavbar /><main className="mx-auto max-w-3xl px-4 pt-28"><Card><CardContent className="p-12 text-center">Medicine could not be loaded.</CardContent></Card></main></div>
  const medicine = medicineQuery.data

  return <div className="min-h-screen bg-muted/20"><PublicNavbar /><main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
    <Link to={`/medicines/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to medicine</Link>
    <div className="mt-7 grid gap-7 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit overflow-hidden rounded-3xl border-border/70 shadow-sm"><div className="aspect-[4/3] bg-white">{medicine.imageUrl ? <img src={medicine.imageUrl} alt="" className="h-full w-full object-cover" /> : null}</div><CardContent className="p-6"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Prescription required</span><h1 className="mt-2 text-2xl font-bold">{medicine.name}</h1><p className="mt-2 text-sm text-muted-foreground">{medicine.genericName} · {medicine.strength} · {medicine.dosageForm}</p><div className="mt-5 border-t pt-5"><p className="text-sm text-muted-foreground">Requested item</p><p className="mt-1 font-medium">1 {medicine.sellingUnit} · {medicine.packSize}</p><p className="mt-1 text-lg font-bold">RWF {Number(medicine.price).toLocaleString()}</p></div></CardContent></Card>
      <section><span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Secure prescription request</span><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Upload your prescription first</h2><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">The medicine will not be added to your request until you choose valid prescription files and continue. A pharmacist must review the original before payment.</p>
        <Card className="mt-7 overflow-hidden rounded-3xl border-border/70 shadow-sm"><CardContent className="p-6 sm:p-8"><label htmlFor="prescription-files" className="group flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center transition hover:border-primary/50 hover:bg-primary/[0.03]"><span className="rounded-2xl bg-primary/10 p-4 text-primary transition group-hover:scale-105"><Upload className="h-7 w-7" /></span><b className="mt-4">Choose prescription files</b><span className="mt-2 text-sm text-muted-foreground">Images, PDF, DOC, DOCX, or ODT · maximum 3 files · 10 MB each</span></label><input id="prescription-files" className="sr-only" type="file" multiple accept="image/*,.pdf,.doc,.docx,.odt" onChange={(event) => selectFiles(event.target.files)} />
          {error && <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          {files.length > 0 && <div className="mt-5 space-y-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border bg-background p-3"><span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600"><FileCheck2 className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{Math.ceil(file.size / 1024)} KB</p></div><button aria-label="Remove file" onClick={() => setFiles(files.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button></div>)}</div>}
          <Button className="mt-6 h-12 w-full rounded-xl" disabled={!files.length} onClick={continueRequest}><FileText className="mr-2 h-4 w-4" />Continue with prescription</Button>
        </CardContent></Card><div className="mt-5 flex gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p>Your files are submitted only after phone verification and are stored privately. Uploading does not approve the request or authorize a dose.</p></div>
      </section>
    </div>
  </main></div>
}
