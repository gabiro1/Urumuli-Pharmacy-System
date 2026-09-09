import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Pill, ShieldCheck, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const acceptSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    phone: optionalPhoneSchema,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export default function AcceptInvitationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const setSession = useAuthStore((s) => s.updateTokens)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(acceptSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values) => {
    if (!token || token.length < 32) {
      setServerError('This invitation link is invalid or incomplete.')
      return
    }
    setIsSubmitting(true)
    setServerError(null)
    try {
      const { data } = await api.post('/auth/invitations/accept', {
        token,
        fullName: values.fullName,
        phone: values.phone?.trim() || undefined,
        password: values.password,
      })
      const { user, accessToken, refreshToken } = data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      setSession(accessToken, refreshToken, user)
      toast.success(`Welcome aboard, ${user.first_name || 'staff member'}!`)
      navigate('/app', { replace: true })
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to accept the invitation.')
      setServerError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md space-y-8"
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 rounded-2xl bg-primary text-primary-foreground">
              <MailCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Accept your invitation
              </h1>
              <p className="text-muted-foreground mt-2">
                Set your password to activate your staff account.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <p>
              Your invitation is valid for 48 hours. If it has expired, contact your
              administrator for a new one.
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
              <p className="text-xs text-muted-foreground">
                At least 8 characters with uppercase, lowercase, and a number.
              </p>
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

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating account...
                </>
              ) : (
                'Activate my account'
              )}
            </Button>
          </form>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Pill className="w-3 h-3" />
            Urumuli Pharmacy System — staff onboarding
          </p>
        </motion.div>
      </main>
      <PublicFooter />
    </div>
  )
}
