import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function PatientPageShell({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn('mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8', className)}
    >
      {children}
    </motion.div>
  )
}

export function PatientPageHeader({ eyebrow = 'Patient portal', title, description, action }) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
