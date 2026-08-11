import Link from 'next/link'

import { Container, MedicineCard, SectionHeading } from '@/components/site'

export const metadata = {
  title: 'Home',
  description: 'Browse medicines, check product details, and search the public Urumuli Pharmacy catalog.',
}

async function getMedicines() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/search?limit=8`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const medicines = await getMedicines()

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
        <Container className="relative">
          <div className="max-w-4xl">
            <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
              Trusted medicine catalog
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find the medicines you need with a cleaner search experience.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Urumuli Pharmacy helps patients discover products, compare details,
              and move from search to care without extra friction.
            </p>
            <form
              className="mt-10 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur-sm sm:grid-cols-[minmax(0,1fr)_auto]"
              method="GET"
              action="/search"
            >
              <input
                type="text"
                name="q"
                placeholder="Search by medicine name, generic name, or symptoms"
                className="h-14 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-base text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
              <button
                type="submit"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Search medicines
              </button>
            </form>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                'Public catalog with medicine details',
                'Fast search across brand and generic names',
                'Prescription and OTC labels at a glance',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-6 sm:py-10">
        <Container>
          <SectionHeading
            eyebrow="Popular medicines"
            title="Browse the most requested items"
            description="A curated preview from the current pharmacy catalog."
            action={
              <Link
                href="/search"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
              >
                Open full search
              </Link>
            }
          />

          <div className="mt-8">
            {medicines.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {medicines.map((medicine) => (
                  <MedicineCard key={medicine.id} medicine={medicine} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                No medicines are available right now. Try the search page or check back soon.
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="py-10 sm:py-16">
        <Container>
          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-8 shadow-glow sm:p-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
                Need something specific?
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Search by product, generic name, or symptom and move faster.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                The public site stays focused on Tailwind utilities, so the
                layout is responsive, consistent, and easy to extend.
              </p>
              <div className="mt-6">
                <Link
                  href="/search"
                  className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Go to search
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  )
}
