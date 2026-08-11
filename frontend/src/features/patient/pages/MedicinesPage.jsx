import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Pill } from 'lucide-react'
import api from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function MedicinesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:3000'

  const handleSearch = (e) => {
    setSearch(e.target.value)
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['public-medicines', debouncedSearch],
    queryFn: () =>
      api.get(`/search?q=${encodeURIComponent(debouncedSearch)}&limit=20`).then((r) => r.data),
    enabled: debouncedSearch.length > 0,
  })

  const medicines = data?.data || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medicines</h1>
        <p className="text-sm text-muted-foreground">Browse our medicine catalog</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search medicines..."
          value={search}
          onChange={handleSearch}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-2" />
                <Skeleton className="h-3 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : medicines.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {medicines.map((med, i) => (
            <motion.div
              key={med.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => window.open(`${publicSiteUrl}/medicines/${med.id}`, '_blank', 'noopener,noreferrer')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{med.name}</h3>
                      {med.generic_name && (
                        <p className="text-xs text-muted-foreground truncate">{med.generic_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {med.strength} {med.dosage_form}
                        </span>
                        <Badge variant={med.requires_prescription ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {med.requires_prescription ? 'Rx' : 'OTC'}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold mt-1">
                        RWF {med.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : search ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No medicines found for &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex p-4 rounded-full bg-muted mb-4">
            <Pill className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Search Medicines</h3>
          <p className="text-sm text-muted-foreground">
            Type a name above to search our catalog
          </p>
        </div>
      )}
    </motion.div>
  )
}
