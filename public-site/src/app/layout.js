import './globals.css'

import { SiteFooter, SiteHeader } from '@/components/site'

export const metadata = {
  title: {
    default: 'Urumuli Pharmacy - Your Trusted Pharmacy',
    template: '%s | Urumuli Pharmacy',
  },
  description:
    'Urumuli Pharmacy provides quality medicines, prescription services, and healthcare products. Visit our pharmacy for professional pharmaceutical care.',
  keywords: ['pharmacy', 'medicines', 'healthcare', 'Rwanda', 'prescription', 'drugstore'],
  openGraph: {
    type: 'website',
    locale: 'en_RW',
    siteName: 'Urumuli Pharmacy',
    title: 'Urumuli Pharmacy - Your Trusted Pharmacy',
    description: 'Quality medicines and professional pharmaceutical care.',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Pharmacy',
              name: 'Urumuli Pharmacy',
              description: 'Your trusted pharmacy providing quality medicines and healthcare products.',
              url: 'https://urumuli-pharmacy.rw',
              telephone: '+250-XXX-XXX-XXX',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'RW',
              },
              openingHours: 'Mo-Sa 08:00-20:00',
              areaServed: 'RW',
            }),
          }}
        />
      </head>
      <body>
        <div className="relative isolate min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(to_bottom,_rgba(15,23,42,0.96),_rgba(2,6,23,1))]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40 [mask-image:linear-gradient(to_bottom,white,transparent_85%)]" />
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  )
}
