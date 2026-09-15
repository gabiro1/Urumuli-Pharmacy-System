import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ShieldCheck, Upload, LogIn } from 'lucide-react'
import api from '@/lib/api'
import { useCartStore } from '@/stores/cartStore'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import { usePrescriptionDraftStore } from '@/stores/prescriptionDraftStore'
import PublicNavbar from '@/components/shared/PublicNavbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, clear } = useCartStore()
  const { isAuthenticated, user } = usePatientAuthStore()
  const draftFiles = usePrescriptionDraftStore((state) => state.files)
  const clearDraft = usePrescriptionDraftStore((state) => state.clearDraft)

  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    email: user?.email || '',
    phone: user?.phone || '',
    fulfilmentMethod: 'PICKUP',
    deliveryAddress: '',
    notificationChannel: 'SMS',
    paymentMethod: 'PAY_ON_PICKUP',
    consent: false,
  })
  const [files, setFiles] = useState(draftFiles)

  const rx = items.some(
    (x) => x.medicine.classification === 'PRESCRIPTION_REQUIRED' || x.medicine.requiresPrescription
  )

  const change = (e) =>
    setForm({
      ...form,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    })

  const submit = async () => {
    if (!items.length) return
    setBusy(true)
    try {
      const key = crypto.randomUUID()
      const response = await api.post(
        '/orders',
        {
          items: items.map((x) => ({ medicineId: x.medicine.id, quantity: x.quantity })),
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          fulfilmentMethod: form.fulfilmentMethod,
          deliveryAddress: form.deliveryAddress,
          notificationChannel: form.notificationChannel,
          paymentMethod: form.paymentMethod,
          consent: form.consent,
        },
        { headers: { 'Idempotency-Key': key } }
      )
      const order = response.data.data
      if (rx) {
        if (!files.length) {
          toast.error('Upload the prescription before submitting')
          setBusy(false)
          return
        }
        const fd = new FormData()
        files.forEach((file) => fd.append('files', file))
        await api.post(`/orders/${order.id}/prescription`, fd)
      }
      clear()
      clearDraft()
      navigate(`/orders/${order.id}`)
    } catch (e) {
      toast.error(e.response?.data?.error || e.response?.data?.message || 'Order could not be submitted')
    } finally {
      setBusy(false)
    }
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <main className="content-shell pt-28">
          <Card>
            <CardContent className="p-12 text-center">Your cart is empty.</CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <main className="content-shell pt-28">
          <Card className="mx-auto max-w-md overflow-hidden rounded-3xl">
            <CardContent className="flex flex-col items-center p-10 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <LogIn className="h-8 w-8" />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Sign in required</h2>
              <p className="mt-2 max-w-sm text-muted-foreground">
                You need to be signed in to complete your order. Please sign in or create an account.
              </p>
              <Button
                size="lg"
                className="mt-6 gap-2"
                onClick={() => navigate('/login')}
              >
                Sign in to continue
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6">
        <div className="mb-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Secure patient checkout
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Complete your medicine request
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Review your order details and submit your medicine request.
          </p>
        </div>

        <Card className="overflow-hidden rounded-3xl border-border/70 shadow-[0_24px_70px_-45px_rgb(0,0,0,0.45)]">
          <div className="border-b bg-card px-6 py-5 sm:px-8">
            <p className="font-semibold">Delivery and order details</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} medicine item{items.length === 1 ? '' : 's'} in this request
            </p>
          </div>
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={change}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={change}
                    placeholder="+250 7XX XXX XXX"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={change}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label>Fulfilment</Label>
                <Select
                  value={form.fulfilmentMethod}
                  onValueChange={(v) => setForm({ ...form, fulfilmentMethod: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PICKUP">Pickup</SelectItem>
                    <SelectItem value="DELIVERY">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.fulfilmentMethod === 'DELIVERY' && (
                <div>
                  <Label htmlFor="deliveryAddress">Delivery address</Label>
                  <Input
                    id="deliveryAddress"
                    name="deliveryAddress"
                    value={form.deliveryAddress}
                    onChange={change}
                    className="mt-2"
                  />
                </div>
              )}

              {rx && (
                <div>
                  <Label htmlFor="prescription">Prescription files</Label>
                  <label
                    htmlFor="prescription"
                    className="mt-2 flex cursor-pointer flex-col items-center rounded-xl border border-dashed p-7 text-center"
                  >
                    <Upload className="h-7 w-7 text-primary" />
                    <span className="mt-2 text-sm font-medium">
                      Images, PDF, DOC, DOCX, or ODT — up to 10 MB each
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      Maximum 3 files. A pharmacist must review these before payment.
                    </span>
                  </label>
                  <input
                    id="prescription"
                    className="sr-only"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.odt"
                    onChange={(e) => setFiles([...e.target.files])}
                  />
                  {files.length > 0 && (
                    <p className="mt-2 text-sm">{files.length} file(s) selected</p>
                  )}
                </div>
              )}

              <label className="flex items-start gap-3 rounded-xl border p-4">
                <input
                  type="checkbox"
                  name="consent"
                  checked={form.consent}
                  onChange={change}
                  className="mt-1"
                />
                <span className="text-sm">
                  I consent to privacy terms and pharmacy processing for this order.
                </span>
              </label>

              <Button
                disabled={
                  busy ||
                  !form.fullName ||
                  !form.phone ||
                  !form.consent ||
                  (form.fulfilmentMethod === 'DELIVERY' && !form.deliveryAddress) ||
                  (rx && !files.length)
                }
                onClick={submit}
                className="w-full"
              >
                {rx ? 'Submit medicine request' : 'Place OTC order'}
              </Button>

              <p className="flex gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Prescription orders cannot proceed to payment or preparation until reviewed and
                approved by a pharmacist.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
