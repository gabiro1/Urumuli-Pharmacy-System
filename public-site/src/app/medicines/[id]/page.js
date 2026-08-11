import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Container, formatPrice } from '@/components/site'

async function getMedicine(id) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/inventory/medicines/${id}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }) {
  const medicine = await getMedicine(params.id)
  if (!medicine) return { title: 'Medicine Not Found' }

  return {
    title: medicine.name,
    description: `${medicine.name} (${medicine.generic_name || ''}) - ${medicine.strength || ''} ${medicine.dosage_form || ''}. ${medicine.description || 'Prescription and OTC medicine available at Urumuli Pharmacy.'}`.substring(0, 160),
    keywords: [medicine.name, medicine.generic_name, medicine.brand_name, medicine.category, 'pharmacy', 'Rwanda'].filter(Boolean).join(', '),
    openGraph: {
      title: `${medicine.name} | Urumuli Pharmacy`,
      description: `${medicine.name} - ${medicine.strength || ''} ${medicine.dosage_form || ''}. ${medicine.requires_prescription ? 'Prescription required.' : 'Over-the-counter.'}`,
    },
  }
}

function DetailRow({ label, value }) {
  if (!value) return null

  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-4 last:border-0 last:pb-0">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-white">{value}</dd>
    </div>
  )
}

export default async function MedicinePage({ params }) {
  const medicine = await getMedicine(params.id)
  if (!medicine) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Drug',
    name: medicine.name,
    description: medicine.description,
    activeIngredient: medicine.generic_name,
    manufacturer: medicine.manufacturer,
    dosageForm: medicine.dosage_form,
    strength: medicine.strength,
    price: medicine.price,
    priceCurrency: 'RWF',
    category: medicine.category,
    prescriptionStatus: medicine.requires_prescription ? 'PrescriptionRequired' : 'OTC',
  }

  return (
    <div className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="py-16 sm:py-20">
        <Container>
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Link className="transition hover:text-white" href="/">
              Home
            </Link>
            <span>/</span>
            <Link className="transition hover:text-white" href="/search">
              Medicines
            </Link>
            <span>/</span>
            <span className="text-slate-200">{medicine.name}</span>
          </nav>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
                {medicine.requires_prescription ? 'Prescription required' : 'Over the counter'}
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {medicine.name}
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-slate-300">
                  {medicine.description || 'Detailed product information from the public catalog.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {medicine.generic_name ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                    Generic: {medicine.generic_name}
                  </span>
                ) : null}
                {medicine.brand_name ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                    Brand: {medicine.brand_name}
                  </span>
                ) : null}
                {medicine.category ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                    Category: {medicine.category}
                  </span>
                ) : null}
              </div>

              {medicine.description ? (
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30">
                  <h2 className="text-lg font-semibold text-white">Description</h2>
                  <p className="mt-4 leading-7 text-slate-300">{medicine.description}</p>
                </section>
              ) : null}

              {medicine.symptoms ? (
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30">
                  <h2 className="text-lg font-semibold text-white">Used For</h2>
                  <p className="mt-4 leading-7 text-slate-300">{medicine.symptoms}</p>
                </section>
              ) : null}

              {medicine.side_effects ? (
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30">
                  <h2 className="text-lg font-semibold text-white">Side Effects</h2>
                  <p className="mt-4 leading-7 text-slate-300">{medicine.side_effects}</p>
                </section>
              ) : null}

              {medicine.contraindications ? (
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30">
                  <h2 className="text-lg font-semibold text-white">Contraindications</h2>
                  <p className="mt-4 leading-7 text-slate-300">{medicine.contraindications}</p>
                </section>
              ) : null}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 shadow-glow">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
                  Current price
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                  {formatPrice(medicine.price)}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Check the public catalog for a fast overview before moving to the prescription workflow.
                </p>
                <Link
                  href="/search"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Back to search
                </Link>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30">
                <h2 className="text-lg font-semibold text-white">Key details</h2>
                <dl className="mt-2">
                  <DetailRow label="Strength" value={medicine.strength} />
                  <DetailRow label="Form" value={medicine.dosage_form} />
                  <DetailRow label="Manufacturer" value={medicine.manufacturer} />
                  <DetailRow label="Category" value={medicine.category} />
                  <DetailRow
                    label="Status"
                    value={medicine.requires_prescription ? 'Prescription required' : 'Over the counter'}
                  />
                </dl>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </div>
  )
}
