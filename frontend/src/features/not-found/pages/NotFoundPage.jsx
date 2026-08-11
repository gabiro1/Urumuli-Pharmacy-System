import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

const floatingVariants = {
  animate: {
    y: [0, -15, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

const orbitVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          variants={orbitVariants}
          animate="animate"
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full border border-primary/10"
        />
        <motion.div
          variants={orbitVariants}
          animate="animate"
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full border border-primary/10"
          style={{ animationDirection: 'reverse' }}
        />
        <motion.div
          variants={pulseVariants}
          animate="animate"
          className="absolute top-1/4 left-1/4 w-4 h-4 rounded-full bg-primary/20"
        />
        <motion.div
          variants={pulseVariants}
          animate="animate"
          className="absolute bottom-1/3 right-1/4 w-6 h-6 rounded-full bg-primary/20"
          style={{ animationDelay: '1s' }}
        />
        <motion.div
          variants={pulseVariants}
          animate="animate"
          className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-primary/20"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative z-10 text-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-8"
        >
          <motion.div
            variants={floatingVariants}
            animate="animate"
            className="inline-block"
          >
            <span className="text-[10rem] sm:text-[12rem] font-black leading-none bg-gradient-to-br from-primary via-primary/60 to-primary/20 bg-clip-text text-transparent select-none">
              404
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Page not found
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              The page you are looking for doesn't exist or has been moved.
              Let's get you back on track.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="h-11"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={() => navigate('/app')}
              className="h-11"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary/40" />
            <span>Urumuli Pharmacy System</span>
            <div className="w-2 h-2 rounded-full bg-primary/40" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
