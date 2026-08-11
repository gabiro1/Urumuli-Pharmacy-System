import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const beams = [
  { path: 'M500 500 L-100 -50', opacity: 0.6, width: 1.5, blur: 0, duration: 3.2, delay: 0 },
  { path: 'M500 500 L1100 -50', opacity: 0.6, width: 1.5, blur: 0, duration: 3.8, delay: 0.3 },
  { path: 'M500 500 L-100 1050', opacity: 0.5, width: 1.2, blur: 0, duration: 4.0, delay: 0.6 },
  { path: 'M500 500 L1100 1050', opacity: 0.5, width: 1.2, blur: 0, duration: 3.5, delay: 0.1 },
  { path: 'M500 500 L0 200', opacity: 0.4, width: 1.0, blur: 0, duration: 3.0, delay: 0.4 },
  { path: 'M500 500 L1000 200', opacity: 0.4, width: 1.0, blur: 0, duration: 3.6, delay: 0.8 },
  { path: 'M500 500 L0 800', opacity: 0.35, width: 1.0, blur: 0, duration: 4.2, delay: 0.2 },
  { path: 'M500 500 L1000 800', opacity: 0.35, width: 1.0, blur: 0, duration: 3.3, delay: 0.7 },
  { path: 'M500 500 L250 -100', opacity: 0.3, width: 0.8, blur: 1, duration: 3.7, delay: 1.0 },
  { path: 'M500 500 L750 -100', opacity: 0.3, width: 0.8, blur: 1, duration: 4.1, delay: 0.5 },
  { path: 'M500 500 L-50 400', opacity: 0.18, width: 0.7, blur: 2, duration: 5.0, delay: 1.2 },
  { path: 'M500 500 L1050 400', opacity: 0.18, width: 0.7, blur: 2, duration: 4.8, delay: 0.9 },
  { path: 'M500 500 L100 -100', opacity: 0.15, width: 0.6, blur: 3, duration: 5.5, delay: 1.5 },
  { path: 'M500 500 L900 -100', opacity: 0.15, width: 0.6, blur: 3, duration: 5.2, delay: 1.1 },
  { path: 'M500 500 L-50 600', opacity: 0.12, width: 0.5, blur: 4, duration: 6.0, delay: 1.8 },
  { path: 'M500 500 L1050 600', opacity: 0.12, width: 0.5, blur: 4, duration: 5.8, delay: 1.4 },
]

export default function BackgroundBeams({ className }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden',
        className
      )}
    >
      <svg
        className="absolute h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {beams.map((_, i) => (
            <linearGradient key={i} id={`beam-grad-${i}`} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0" />
              <stop offset="45%" stopColor="#0EA5E9" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </linearGradient>
          ))}
          <filter id="beam-blur-1">
            <feGaussianBlur stdDeviation="1" />
          </filter>
          <filter id="beam-blur-2">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <filter id="beam-blur-3">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="beam-blur-4">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {beams.map((beam, i) => (
          <motion.path
            key={i}
            d={beam.path}
            stroke={`url(#beam-grad-${i})`}
            strokeWidth={beam.width}
            fill="none"
            filter={beam.blur > 0 ? `url(#beam-blur-${beam.blur})` : undefined}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 1, 0],
              opacity: [0, beam.opacity, beam.opacity, 0],
            }}
            transition={{
              duration: beam.duration,
              repeat: Infinity,
              repeatDelay: beam.delay,
              ease: 'easeInOut',
              delay: beam.delay,
              times: [0, 0.3, 0.7, 1],
            }}
          />
        ))}
      </svg>
    </div>
  )
}
