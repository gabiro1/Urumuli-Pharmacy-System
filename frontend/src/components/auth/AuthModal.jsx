import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import { useAuthModalStore } from '@/stores/authModalStore'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/apiError'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const normalizeOptionalField = (value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
    phone: z.preprocess(
      normalizeOptionalField,
      z.string().regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number').optional()
    ),
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

export default function AuthModal() {
  const navigate = useNavigate()
  const { open, view, redirectPath, closeModal, setView } = useAuthModalStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState(null)

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const afterAuth = () => {
    closeModal()
    const target = redirectPath || '/patient'
    if (target !== window.location.pathname) {
      navigate(target, { replace: true })
    }
  }

  const handleLogin = async (values) => {
    setBusy(true)
    setServerError(null)
    try {
      const { data } = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
      })
      const { user, accessToken, refreshToken } = data.data
      if (user.role === 'PATIENT') {
        usePatientAuthStore.getState().setSession(user, accessToken, refreshToken)
        toast.success('Welcome back!')
        afterAuth()
      } else {
        toast.error('Staff accounts cannot sign in here. Use the staff portal instead.')
      }
    } catch (err) {
      const message = getApiErrorMessage(err, 'Invalid email or password')
      setServerError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async (values) => {
    setBusy(true)
    setServerError(null)
    try {
      const { data } = await api.post('/auth/register/patient', {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone?.trim() || undefined,
        password: values.password,
      })
      const { user, accessToken, refreshToken } = data.data
      usePatientAuthStore.getState().setSession(user, accessToken, refreshToken)
      toast.success('Account created!')
      afterAuth()
    } catch (err) {
      const message = getApiErrorMessage(err, 'Registration failed. Please try again.')
      setServerError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleSuccess = () => {
    toast.success('Welcome back!')
    afterAuth()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) closeModal()
      else setView(view)
    }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view === 'login' ? 'Welcome back' : 'Create your account'}
          </DialogTitle>
          <DialogDescription>
            {view === 'login'
              ? 'Sign in to continue shopping and place your order.'
              : 'Create a patient account to shop and track orders.'}
          </DialogDescription>
        </DialogHeader>

        <GoogleSignInButton onSuccess={handleGoogleSuccess} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or {view === 'login' ? 'sign in' : 'register'} with email
            </span>
          </div>
        </div>

        {serverError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {view === 'login' ? (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-email">Email</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                {...loginForm.register('email')}
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="modal-password">Password</Label>
                <Link
                  to="/forgot-password"
                  onClick={closeModal}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="modal-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-fullName">Full name</Label>
              <Input
                id="modal-fullName"
                placeholder="John Doe"
                autoComplete="name"
                {...registerForm.register('fullName')}
              />
              {registerForm.formState.errors.fullName && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-email">Email</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                {...registerForm.register('email')}
              />
              {registerForm.formState.errors.email && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-phone">Phone number (optional)</Label>
              <Input
                id="modal-phone"
                type="tel"
                placeholder="+250 7XX XXX XXX"
                autoComplete="tel"
                {...registerForm.register('phone')}
              />
              {registerForm.formState.errors.phone && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-new-password">Password</Label>
              <div className="relative">
                <Input
                  id="modal-new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...registerForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {registerForm.formState.errors.password && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-confirm-password">Confirm password</Label>
              <div className="relative">
                <Input
                  id="modal-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...registerForm.register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {registerForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {registerForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {view === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setView('register')}
                className="font-medium text-primary hover:underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setView('login')}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  )
}