import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Eye,
  EyeOff,
  Loader2,
  Pill,
  Activity,
  Shield,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'
import { getApiErrorMessage } from '@/lib/apiError'

const normalizeOptionalField = (value) => {
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const optionalPhoneSchema = z.preprocess(
  normalizeOptionalField,
  z.string().regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number').optional()
)

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
    phone: optionalPhoneSchema,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.string().min(1, 'Role is required'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const strengthConfig = [
  { label: 'Weak', color: 'bg-destructive', score: 0 },
  { label: 'Weak', color: 'bg-destructive', score: 1 },
  { label: 'Medium', color: 'bg-yellow-500', score: 2 },
  { label: 'Strong', color: 'bg-emerald-500', score: 3 },
  { label: 'Very Strong', color: 'bg-emerald-500', score: 4 },
]

const fallbackRoles = [
  { name: 'ADMIN' },
  { name: 'AUDITOR' },
  { name: 'CASHIER' },
  { name: 'INVENTORY_MANAGER' },
  { name: 'MANAGER' },
  { name: 'PHARMACIST' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const registerUser = useAuthStore((s) => s.register)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [roles, setRoles] = useState(fallbackRoles)
  const [rolesLoading, setRolesLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/roles')
      .then((r) => {
        const apiRoles = Array.isArray(r.data.data) && r.data.data.length > 0
          ? r.data.data
          : fallbackRoles
        setRoles(apiRoles)
      })
      .catch(() => setRoles(fallbackRoles))
      .finally(() => setRolesLoading(false))
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'PHARMACIST',
      acceptTerms: false,
    },
  })

  const password = watch('password')

  const passwordStrength = useMemo(() => {
    let score = 0
    if (!password) return { score: 0, label: '', color: 'bg-muted', width: '0%' }
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    const config = strengthConfig[score] || strengthConfig[0]
    return {
      score,
      label: config.label,
      color: config.color,
      width: `${(score / 4) * 100}%`,
    }
  }, [password])

  const onSubmit = async (values) => {
    setIsSubmitting(true)
    setServerError(null)
    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone?.trim() || undefined,
        password: values.password,
        role: values.role,
      })
      toast.success('Account created successfully! Please sign in.')
      navigate('/login', { replace: true })
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
      <main className="flex-1 flex pt-16">
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-primary/60"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-white blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-white blur-3xl" />
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
                  <p className="text-white/70 text-sm">Pharmacy System</p>
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
                Join the Platform
              </h2>
              <p className="text-white/80 leading-relaxed">
                Create your account and start managing prescriptions,
                communicating with patients, and tracking workflows — all in
                one secure platform.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-12 grid grid-cols-3 gap-6 w-full max-w-md"
            >
              {[
                { icon: Activity, label: 'Prescriptions' },
                { icon: Shield, label: 'Secure' },
                { icon: MessageSquare, label: 'Messaging' },
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

        <div className="flex-1 flex items-center justify-center auth-shell bg-background min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md space-y-8 py-8"
          >
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Urumuli</h1>
                <p className="text-xs text-muted-foreground">Prescription Portal</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                Create an account
              </h2>
              <p className="text-muted-foreground">
                Fill in your details to get started
              </p>
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
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...register('fullName')}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

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
                  <p className="text-xs text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+250 7XX XXX XXX"
                  autoComplete="tel"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
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
                      Strength:{' '}
                      <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  </div>
                )}
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                {rolesLoading ? (
                  <Skeleton className="h-10 w-full rounded-md" />
                ) : (
                  <select
                    id="role"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register('role')}
                  >
                    <option value="">Select a role...</option>
                    {roles.map((role) => (
                      <option key={role.name} value={role.name}>
                        {role.name.charAt(0) + role.name.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                )}
                {errors.role && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.role.message}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  className="rounded border-input bg-background text-primary focus:ring-primary h-4 w-4 mt-1"
                  {...register('acceptTerms')}
                />
                <Label
                  htmlFor="acceptTerms"
                  className="text-sm font-normal leading-relaxed cursor-pointer"
                >
                  I accept the{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-xs text-destructive">
                  {errors.acceptTerms.message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
