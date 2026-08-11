import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Pill, UserPlus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'
import { getApiErrorMessage } from '@/lib/apiError'

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  phone: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value

      const trimmed = value.trim()
      return trimmed === '' ? undefined : trimmed
    },
    z.string()
      .min(10, 'Phone number must be at least 10 digits')
      .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number')
      .optional()
  ),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default function PatientRegisterPage() {
  const navigate = useNavigate()
  const register = usePatientAuthStore((s) => s.register)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  const {
    register: formRegister,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '', acceptTerms: false },
  })

  const password = watch('password')

  const getStrength = (pw) => {
    if (!pw) return { score: 0, label: '', width: '0%', color: 'bg-muted' }
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    const configs = [
      { label: 'Weak', color: 'bg-destructive', width: '20%' },
      { label: 'Weak', color: 'bg-destructive', width: '40%' },
      { label: 'Medium', color: 'bg-yellow-500', width: '60%' },
      { label: 'Strong', color: 'bg-emerald-500', width: '80%' },
      { label: 'Very Strong', color: 'bg-emerald-500', width: '100%' },
    ]
    return configs[score] || configs[0]
  }

  const passwordStrength = getStrength(password)

  const onSubmit = async (values) => {
    setIsSubmitting(true)
    setServerError(null)
    try {
      await register({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone?.trim() || undefined,
        password: values.password,
      })
      toast.success('Account created! Welcome to Urumuli.')
      navigate('/patient', { replace: true })
    } catch (err) {
      const message = getApiErrorMessage(err, 'Registration failed. Please try again.')
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
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                <UserPlus className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Join</h1>
                <p className="text-white/70 text-sm">Urumuli Patient Portal</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-center max-w-md"
          >
            <h2 className="text-2xl font-semibold mb-4">Your Pharmacy, In Your Pocket</h2>
            <p className="text-white/80 leading-relaxed">
              Connect with your pharmacist, manage prescriptions, and take control of your health journey.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-12 space-y-4 w-full max-w-sm"
          >
            {[
              'Secure messaging with pharmacists',
              'Prescription upload & tracking',
              'Medicine information at your fingertips',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-white/20">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <div className="flex-1 flex items-center justify-center auth-shell bg-background min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md space-y-8 py-8"
        >
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Urumuli</h1>
              <p className="text-xs text-muted-foreground">Patient Portal</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
            <p className="text-muted-foreground">Join Urumuli for secure pharmacy care</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="John Doe" autoComplete="name" {...formRegister('fullName')} />
              {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" autoComplete="email" {...formRegister('email')} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (optional)</Label>
              <Input id="phone" type="tel" placeholder="+250 7XX XXX XXX" autoComplete="tel" {...formRegister('phone')} />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  {...formRegister('password')}
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
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: passwordStrength.width }}
                      transition={{ duration: 0.3 }}
                      className={`h-full rounded-full ${passwordStrength.color}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength: <span className="font-medium">{passwordStrength.label}</span>
                  </p>
                </div>
              )}
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  {...formRegister('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <div className="flex items-start gap-2">
              <input
                id="acceptTerms"
                type="checkbox"
                className="rounded border-input bg-background text-primary focus:ring-primary h-4 w-4 mt-1"
                {...formRegister('acceptTerms')}
              />
              <Label htmlFor="acceptTerms" className="text-sm font-normal leading-relaxed cursor-pointer">
                I accept the{' '}
                <Link to="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </Label>
            </div>
            {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>}

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/patient/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
      </div>
      <PublicFooter />
    </div>
  )
}
