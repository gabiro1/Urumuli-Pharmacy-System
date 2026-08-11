import SearchPage from './SearchPage'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'

export default function PublicMedicinesPage() {
  return (
    <div className="min-h-screen bg-muted/20">
      <PublicNavbar />
      <main className="content-shell pb-20 pt-24 sm:pt-28">
        <SearchPage publicMode />
      </main>
      <PublicFooter />
    </div>
  )
}
