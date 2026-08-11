import Link from 'next/link'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatPrice(price) {
  const value = Number(price)
  if (!Number.isFinite(value)) {
    return 'Price on request'
  }

  return `RWF ${new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
  }).format(value)}`
}

export function Container({ children, className = '' }) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}

export function Logo({ className = 'h-11 w-11' }) {
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('shrink-0', className)}
      >
        <rect width="40" height="40" rx="12" className="fill-emerald-400" />
        <path d="M20 11V29" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <path d="M11 20H29" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="leading-tight">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">
          Urumuli
        </p>
        <p className="text-base font-semibold text-white">Pharmacy</p>
      </div>
    </div>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between py-4">
        <Link href="/" className="group">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Home
          </Link>
          <Link
            href="/search"
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Search
          </Link>
        </nav>

        <Link
          href="/search"
          className="inline-flex items-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
        >
          Browse medicines
        </Link>
      </Container>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80">
      <Container className="py-10">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo className="h-10 w-10" />
            <p className="max-w-md text-sm leading-7 text-slate-400">
              A clean public catalog for browsing medicines, checking details,
              and finding the right product faster.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
              Explore
            </p>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
              <Link className="transition hover:text-white" href="/">
                Home
              </Link>
              <Link className="transition hover:text-white" href="/search">
                Search medicines
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
              Catalog
            </p>
            <p className="text-sm leading-7 text-slate-400">
              Built with Tailwind utilities for a consistent, responsive, and
              maintainable presentation layer.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Urumuli Pharmacy System.</p>
        </div>
      </Container>
    </footer>
  )
}

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

export function MedicineCard({ medicine }) {
  const price = formatPrice(medicine.price)
  const strength = [medicine.strength, medicine.dosage_form].filter(Boolean).join(' ')

  return (
    <Link
      href={`/medicines/${medicine.id}`}
      className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-white/[0.07] hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
            {medicine.requires_prescription ? 'Prescription' : 'OTC'}
          </p>
          <h3 className="text-lg font-semibold text-white transition group-hover:text-emerald-100">
            {medicine.name}
          </h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
          {medicine.requires_prescription ? 'Rx' : 'OTC'}
        </span>
      </div>

      {medicine.generic_name ? (
        <p className="mt-3 text-sm text-slate-300">{medicine.generic_name}</p>
      ) : null}

      <p className="mt-2 text-sm text-slate-400">
        {strength || 'Available in the public catalog'}
      </p>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Price</p>
          <p className="mt-1 text-xl font-semibold text-white">{price}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition group-hover:border-emerald-400/40 group-hover:bg-emerald-400/10">
          View details
        </span>
      </div>
    </Link>
  )
}
