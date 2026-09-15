import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Pill, Activity, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import api from '@/lib/api'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import { getApiErrorMessage } from '@/lib/apiError'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const onSubmit = async (values) => {
    setIsSubmitting(true)
    setServerError(null)
    try {
      const { data } = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
      })
      const { user, accessToken, refreshToken } = data.data
      const from =
        searchParams.get('redirect') || location.state?.from?.pathname

      let target
      if (user.role === 'PATIENT') {
        usePatientAuthStore
          .getState()
          .setSession(user, accessToken, refreshToken)
        target = from && from.startsWith('/patient') ? from : '/patient'
      } else {
        useAuthStore.getState().setSession(user, accessToken, refreshToken)
        target = !from || from.startsWith('/patient') ? '/app' : from
      }

      toast.success('Welcome back!')
      navigate(target, { replace: true })
    } catch (err) {
      const message = getApiErrorMessage(err, 'Invalid email or password')
      setServerError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSuccess = () => {
    const from = searchParams.get('redirect') || location.state?.from?.pathname
    const target = from && !from.startsWith('/app') ? from : '/patient'
    toast.success('Welcome back!')
    navigate(target, { replace: true })
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
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white blur-3xl" />
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
              One Platform, All of Your Pharmacy Needs
            </h2>
            <p className="text-white/80 leading-relaxed">
              Patients can request medicines, chat with their pharmacist, and
              track orders — while staff manage inventory, prescriptions, and
              sales in real time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-12 grid grid-cols-3 gap-6 w-full max-w-md"
          >
                          {[
              { icon: Activity, label: 'Inventory' },
              { icon: Shield, label: 'Secure' },
              { icon: Pill, label: 'Prescriptions' },
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
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Urumuli</h1>
              <p className="text-xs text-muted-foreground">Pharmacy System</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">
              Sign in to your account to continue
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
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                className="rounded border-input bg-background text-primary focus:ring-primary h-4 w-4"
                {...register('rememberMe')}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                Remember me
              </Label>
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <GoogleSignInButton onSuccess={handleGoogleSuccess} />


          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-primary font-medium hover:underline"
            >
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
      <PublicFooter />
    </div>
  )
}
