import Link from 'next/link'

import { Container, MedicineCard, SectionHeading } from '@/components/site'

export const metadata = {
  title: 'Search Medicines',
  description: 'Search our complete catalog of medicines, OTC drugs, and healthcare products.',
}

function getSearchValue(value) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return value || ''
}

async function searchMedicines(searchParams) {
  const params = new URLSearchParams()
  const query = getSearchValue(searchParams.q)
  const category = getSearchValue(searchParams.category)
  const page = getSearchValue(searchParams.page)

  if (query) params.set('q', query)
  if (category) params.set('categoryId', category)
  if (page) params.set('page', page)
  params.set('limit', '20')

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/search?${params}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return { data: [], meta: { total: 0, totalPages: 0, page: 1 } }
    return await res.json()
  } catch {
    return { data: [], meta: { total: 0, totalPages: 0, page: 1 } }
  }
}

function buildSearchHref(searchParams, page) {
  const params = new URLSearchParams()
  const query = getSearchValue(searchParams.q)
  const category = getSearchValue(searchParams.category)

  if (query) params.set('q', query)
  if (category) params.set('category', category)
  if (page > 1) params.set('page', String(page))

  const queryString = params.toString()
  return queryString ? `/search?${queryString}` : '/search'
}

export default async function SearchPage({ searchParams = {} }) {
  const { data: medicines, meta } = await searchMedicines(searchParams)
  const query = getSearchValue(searchParams.q)
  const currentPage = Number(getSearchValue(searchParams.page) || 1)

  return (
    <div className="pb-16">
      <section className="py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
              Search catalog
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Search the full medicine catalog.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Find a medicine by name, generic name, or symptoms and open a
              focused detail view.
            </p>

            <form
              className="mt-10 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur-sm sm:grid-cols-[minmax(0,1fr)_auto]"
              method="GET"
              action="/search"
            >
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search by name, symptoms, or category..."
                className="h-14 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-base text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
              <button
                type="submit"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Search
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-400">
              {['Brand name', 'Generic name', 'Symptoms', 'Prescription status'].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          {medicines.length > 0 ? (
            <>
              <SectionHeading
                eyebrow="Results"
                title={`${meta.total} medicines found`}
                description="Open any result to view product details, pricing, and prescription status."
              />

              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {medicines.map((medicine) => (
                  <MedicineCard key={medicine.id} medicine={medicine} />
                ))}
              </div>

              {meta.totalPages > 1 ? (
                <div className="mt-10 flex flex-wrap items-center gap-2">
                  {Array.from({ length: meta.totalPages }, (_, index) => index + 1).map((page) => {
                    const isActive = page === currentPage
                    return (
                      <Link
                        key={page}
                        href={buildSearchHref(searchParams, page)}
                        aria-current={isActive ? 'page' : undefined}
                        className={
                          isActive
                            ? 'inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-4 text-sm font-semibold text-slate-950'
                            : 'inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/10'
                        }
                      >
                        {page}
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl shadow-slate-950/30">
              <p className="text-lg font-semibold text-white">No medicines found.</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Try a different search term or return to the home page to browse the featured catalog.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
                >
                  Back home
                </Link>
                <Link
                  href="/search"
                  className="inline-flex items-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Reset search
                </Link>
              </div>
            </div>
          )}
        </Container>
      </section>
    </div>
  )
}
