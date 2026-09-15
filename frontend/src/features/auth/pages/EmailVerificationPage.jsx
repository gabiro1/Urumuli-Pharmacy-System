import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/apiError'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState(token ? 'verifying' : 'no-token')
  const [error, setError] = useState('')
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!token || attemptedRef.current) return
    attemptedRef.current = true

    const verify = async () => {
      try {
        const { data } = await api.post('/auth/verify-email', { token })
        const { user, accessToken, refreshToken } = data.data
        const { usePatientAuthStore: store } = await import('@/stores/patientAuthStore')
        store.getState().setSession(user, accessToken, refreshToken)
        setStatus('success')
      } catch (err) {
        setError(getApiErrorMessage(err, 'Verification link is invalid or has expired.'))
        setStatus('error')
      }
    }

    verify()
  }, [token])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center px-4 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md space-y-8"
        >
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground">Verifying your email…</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <CheckCircle className="w-14 h-14 text-green-600" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Email verified!</h2>
                <p className="text-muted-foreground">
                  Your account is now active. Redirecting to your dashboard…
                </p>
              </div>
              <Button asChild className="mt-4">
                <Link to="/patient">Go to dashboard</Link>
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <XCircle className="w-14 h-14 text-destructive" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Verification failed</h2>
                <p className="text-destructive text-sm">{error}</p>
              </div>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          )}

          {status === 'no-token' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="rounded-full bg-primary/10 p-4">
                <Mail className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Check your inbox</h2>
                <p className="text-muted-foreground text-sm">
                  We&apos;ve sent a verification link to your email address.
                  Click the link to activate your account, then come back and sign in.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          )}
        </motion.div>
      </main>
      <PublicFooter />
    </div>
  )
}