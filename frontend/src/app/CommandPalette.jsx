import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import {
  LayoutDashboard,
  Pill,
  ShoppingCart,
  FileText,
  ShieldCheck,
  Search,
  BarChart3,
  ScrollText,
  Shield,
  Command,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigationItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/app', section: 'Navigation' },
  { label: 'Inventory', icon: Pill, path: '/app/inventory', section: 'Navigation' },
  { label: 'Sales', icon: ShoppingCart, path: '/app/sales', section: 'Navigation' },
  { label: 'Prescriptions', icon: FileText, path: '/app/prescriptions', section: 'Navigation' },
  { label: 'Drug Checker', icon: ShieldCheck, path: '/app/safety/drug-checker', section: 'Navigation' },
  { label: 'Search', icon: Search, path: '/app/search', section: 'Navigation' },
  { label: 'Analytics', icon: BarChart3, path: '/app/analytics', section: 'Navigation' },
  { label: 'Audit Logs', icon: ScrollText, path: '/app/audit', section: 'Navigation' },
  { label: 'Admin', icon: Shield, path: '/app/admin', section: 'Navigation' },
]

const medicineQuickAccess = [
  { label: 'Paracetamol 500mg', icon: Pill, path: '/app/products?q=paracetamol', section: 'Products' },
  { label: 'Amoxicillin 250mg', icon: Pill, path: '/app/products?q=amoxicillin', section: 'Products' },
  { label: 'Ibuprofen 400mg', icon: Pill, path: '/app/products?q=ibuprofen', section: 'Products' },
  { label: 'Omeprazole 20mg', icon: Pill, path: '/app/products?q=omeprazole', section: 'Products' },
]

const allItems = [...navigationItems, ...medicineQuickAccess]

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function CommandPalette() {
  const { setCommandPaletteOpen } = useUIStore()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const debouncedQuery = useDebounce(query, 300)

  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) return allItems
    const q = debouncedQuery.toLowerCase()
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q)
    )
  }, [debouncedQuery])

  useEffect(() => {
    setSelectedIndex(0)
  }, [debouncedQuery])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const executeItem = useCallback((item) => {
    setCommandPaletteOpen(false)
    navigate(item.path)
  }, [navigate, setCommandPaletteOpen])

  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
          break
        case 'Enter':
          e.preventDefault()
          if (filteredItems[selectedIndex]) {
            executeItem(filteredItems[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setCommandPaletteOpen(false)
          break
      }
    },
    [filteredItems, selectedIndex, executeItem, setCommandPaletteOpen]
  )

  const sections = useMemo(() => {
    const map = {}
    for (const item of filteredItems) {
      if (!map[item.section]) map[item.section] = []
      map[item.section].push(item)
    }
    return map
  }, [filteredItems])

  let globalIndex = -1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onKeyDown={handleKeyDown}
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="relative w-full max-w-lg rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Command className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, medicines..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-popover-foreground placeholder-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section}
              </p>
              {items.map((item) => {
                globalIndex++
                const idx = globalIndex
                return (
                  <button
                    key={`${item.section}-${item.label}`}
                    onClick={() => executeItem(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      idx === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'text-popover-foreground hover:bg-accent/50'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </button>
                )
              })}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">↵</kbd>
            Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">ESC</kbd>
            Close
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
