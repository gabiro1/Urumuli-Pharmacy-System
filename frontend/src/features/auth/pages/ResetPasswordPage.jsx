import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Pill,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import api from '@/lib/api'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'

const resetSchema = z
  .object({
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

const strengthConfig = [
  { label: 'Weak', color: 'bg-destructive', score: 0 },
  { label: 'Weak', color: 'bg-destructive', score: 1 },
  { label: 'Medium', color: 'bg-yellow-500', score: 2 },
  { label: 'Strong', color: 'bg-emerald-500', score: 3 },
  { label: 'Very Strong', color: 'bg-emerald-500', score: 4 },
]

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
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

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token')
      navigate('/forgot-password', { replace: true })
    }
  }, [token, navigate])

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/login', { replace: true })
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, navigate])

  const onSubmit = async (values) => {
    if (!token) return
    setIsSubmitting(true)
    setServerError(null)
    try {
      await api.post('/auth/reset-password', {
        token,
        password: values.password,
      })
      setIsSuccess(true)
      toast.success('Password reset successfully!')
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to reset password. The link may have expired.'
      setServerError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <main className="flex-1 flex pt-16">
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="p-3 rounded-2xl bg-primary text-primary-foreground"
          >
            <Shield className="w-8 h-8" />
          </motion.div>
        </div>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader className="text-center pb-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.2,
                    type: 'spring',
                    stiffness: 200,
                  }}
                  className="flex justify-center mb-4"
                >
                  <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </motion.div>
                <CardTitle className="text-2xl">Password reset!</CardTitle>
                <CardDescription className="text-base mt-2">
                  Your password has been successfully reset.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Redirecting you to login in a moment...
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center text-sm text-primary hover:underline font-medium"
                >
                  Sign in now
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.2,
                    type: 'spring',
                    stiffness: 200,
                  }}
                  className="flex justify-center mb-4"
                >
                  <div className="p-3 rounded-full bg-primary/10">
                    <Shield className="w-10 h-10 text-primary" />
                  </div>
                </motion.div>
                <CardTitle className="text-2xl">Set new password</CardTitle>
                <CardDescription className="text-base mt-2">
                  Enter your new password below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                >
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
                    <Label htmlFor="password">New Password</Label>
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
                          <span className="font-medium">
                            {passwordStrength.label}
                          </span>
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
                    <Label htmlFor="confirmPassword">
                      Confirm New Password
                    </Label>
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
                        Resetting password...
                      </>
                    ) : (
                      'Reset password'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to login
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
          </motion.div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
