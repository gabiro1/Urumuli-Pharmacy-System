import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, MessageSquare, Shield, Clock, Pill } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'
import { getApiErrorMessage } from '@/lib/apiError'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export default function PatientLoginPage() {
  const navigate = useNavigate()
  const login = usePatientAuthStore((s) => s.login)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values) => {
    setIsSubmitting(true)
    setServerError(null)
    try {
      await login(values.email, values.password)
      toast.success('Welcome back!')
      navigate('/patient', { replace: true })
    } catch (err) {
      const message = getApiErrorMessage(err, 'Invalid email or password')
      setServerError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex pt-16">
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Pill className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Urumuli</h1>
                  <p className="text-white/70 text-sm">Patient Portal</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-center max-w-md"
            >
              <h2 className="text-2xl font-semibold mb-4">
                Your Health, Connected
              </h2>
              <p className="text-white/80 leading-relaxed">
                Securely message your pharmacist, manage prescriptions, and get
                the care you need — all from one place.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-12 grid grid-cols-3 gap-6 w-full max-w-md"
            >
              {[
                { icon: MessageSquare, label: 'Secure Chat' },
                { icon: Shield, label: 'Private' },
                { icon: Clock, label: '24/7 Access' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/10 backdrop-blur-sm"
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        <div className="flex-1 flex items-center justify-center auth-shell bg-background">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md space-y-8"
          >
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Urumuli</h1>
                <p className="text-xs text-muted-foreground">Patient Portal</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground">
                Sign in to your patient account
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  {serverError}
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/patient/register" className="text-primary font-medium hover:underline">
                Create one
              </Link>
            </p>

            <div className="text-center">
              <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Staff login →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
