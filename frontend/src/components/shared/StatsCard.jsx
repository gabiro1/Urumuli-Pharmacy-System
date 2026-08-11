import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Animated Counter Hook ─────────────────────────────────────
function useAnimatedCounter(end, duration = 1500, enabled = true) {
  const [count, setCount] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!enabled || end === undefined || end === null) {
      setCount(end ?? 0)
      return
    }
    startRef.current = null
    const startVal = 0

    function step(timestamp) {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(startVal + (end - startVal) * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [end, duration, enabled])

  return count
}

// ─── Trend Badge ────────────────────────────────────────────────
function TrendBadge({ direction, value, className }) {
  const colors = {
    up: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40',
    down: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40',
    flat: 'text-muted-foreground bg-muted',
  }
  const icons = {
    up: TrendingUp,
    down: TrendingDown,
    flat: Minus,
  }
  const Icon = icons[direction] || Minus

  if (!direction) return null

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', colors[direction], className)}>
      <Icon className="h-3 w-3" />
      {value ? `${value}` : direction === 'up' ? 'Up' : direction === 'down' ? 'Down' : 'Flat'}
    </span>
  )
}

// ─── Mini Progress Bar ──────────────────────────────────────────
function MiniProgress({ value, max = 100, color = 'primary' }) {
  const pct = Math.min((value / max) * 100, 100)
  const barColor =
    color === 'success' ? 'bg-green-500' :
    color === 'warning' ? 'bg-yellow-500' :
    color === 'danger' ? 'bg-red-500' :
    'bg-primary'

  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        className={cn('h-full rounded-full', barColor)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </div>
  )
}

// ─── Stat Card Variants ─────────────────────────────────────────
const variantStyles = {
  primary: {
    border: 'border-l-primary',
    iconBg: 'bg-primary/10 dark:bg-white/10',
    iconColor: 'text-primary dark:text-foreground',
    glow: 'group-hover:shadow-primary/20',
  },
  success: {
    border: 'border-l-green-500',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    iconColor: 'text-green-600 dark:text-green-400',
    glow: 'group-hover:shadow-green-500/20',
  },
  warning: {
    border: 'border-l-yellow-500',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    glow: 'group-hover:shadow-yellow-500/20',
  },
  danger: {
    border: 'border-l-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-400',
    glow: 'group-hover:shadow-red-500/20',
  },
  info: {
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    glow: 'group-hover:shadow-blue-500/20',
  },
}

// ─── Main StatsCard Component ───────────────────────────────────
export default function StatsCard({
  icon: Icon,
  label,
  value,
  sub,
  variant = 'primary',
  trend,
  trendValue,
  progress,
  progressMax,
  progressColor,
  tooltip,
  animate = true,
  className,
  children,
}) {
  const styles = variantStyles[variant] || variantStyles.primary
  const counter = useAnimatedCounter(value, 1500, animate && value !== undefined)

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/50 bg-card',
        'transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
        styles.glow,
        'border-t-[2px]',
        className,
      )}
    >
      {/* Gradient overlay on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          'bg-gradient-to-br from-transparent via-transparent to-white/5 dark:to-white/[0.02]',
        )}
      />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            {/* Label row */}
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {label}
              </p>
              {tooltip && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      {tooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Value with counter */}
            {value !== undefined ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                  {counter}
                </span>
                {trend && (
                  <TrendBadge direction={trend} value={trendValue} />
                )}
              </div>
            ) : (
              <div className="h-9 w-16 animate-pulse rounded-md bg-muted" />
            )}

            {/* Subtitle */}
            {sub && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {sub}
              </p>
            )}

            {/* Progress bar */}
            {progress !== undefined && (
              <div className="pt-1.5">
                <MiniProgress
                  value={progress}
                  max={progressMax}
                  color={progressColor || variant}
                />
              </div>
            )}

            {/* Extra children content */}
            {children}
          </div>

          {/* Icon */}
          {Icon && (
            <div className={cn(
              'shrink-0 p-3 rounded-xl transition-all duration-300',
              'group-hover:scale-110 group-hover:shadow-sm',
              styles.iconBg,
            )}>
              <Icon className={cn('h-5 w-5', styles.iconColor)} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
