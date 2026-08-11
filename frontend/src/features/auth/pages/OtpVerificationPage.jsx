import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, Smartphone, ArrowLeft, Clock, Pill } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

const OTP_LENGTH = 6
const RESEND_TIMER = 60

export default function OtpVerificationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const purpose = searchParams.get('purpose') || 'verification'

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [activeIndex, setActiveIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timer, setTimer] = useState(RESEND_TIMER)
  const [canResend, setCanResend] = useState(false)
  const [serverError, setServerError] = useState(null)

  const inputRefs = useRef([])

  const resetTimer = useCallback(() => {
    setTimer(RESEND_TIMER)
    setCanResend(false)
  }, [])

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true)
      return
    }
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timer])

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setServerError(null)

    if (value && index < OTP_LENGTH - 1) {
      setActiveIndex(index + 1)
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp]
      newOtp[index - 1] = ''
      setOtp(newOtp)
      setActiveIndex(index - 1)
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const newOtp = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]
    }
    setOtp(newOtp)
    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    setActiveIndex(nextIndex)
    inputRefs.current[nextIndex]?.focus()
  }

  const handleResend = async () => {
    if (!canResend) return
    try {
      await api.post('/auth/resend-otp', { email, purpose })
      resetTimer()
      toast.success('OTP resent successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== OTP_LENGTH) {
      setServerError('Please enter the complete 6-digit code')
      return
    }

    setIsSubmitting(true)
    setServerError(null)
    try {
      await api.post('/auth/verify-otp', { email, otp: code, purpose })
      toast.success('Verification successful!')
      if (purpose === 'password-reset') {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`, {
          replace: true,
        })
      } else {
        navigate('/login', { replace: true })
      }
    } catch (err) {
      const message =
        err.response?.data?.message || 'Invalid or expired OTP'
      setServerError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const otpValue = otp.join('')
  const isComplete = otpValue.length === OTP_LENGTH

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
            <Smartphone className="w-8 h-8" />
          </motion.div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-4"
            >
              <div className="p-3 rounded-full bg-primary/10">
                <Smartphone className="w-10 h-10 text-primary" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl">Verify your identity</CardTitle>
            <CardDescription className="text-base mt-2">
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center"
              >
                {serverError}
              </motion.div>
            )}

            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <input
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    onFocus={() => setActiveIndex(index)}
                    className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-lg border-2 transition-all duration-200 bg-background
                      ${
                        activeIndex === index
                          ? 'border-primary ring-2 ring-primary/20'
                          : digit
                          ? 'border-primary'
                          : 'border-input'
                      }
                      focus:outline-none
                    `}
                    aria-label={`Digit ${index + 1}`}
                  />
                </motion.div>
              ))}
            </div>

            <Button
              onClick={handleVerify}
              className="w-full h-11"
              disabled={!isComplete || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>

            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {canResend ? (
                  <button
                    onClick={handleResend}
                    className="text-primary hover:underline font-medium"
                  >
                    Resend code
                  </button>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Resend code in {timer}s</span>
                  </>
                )}
              </div>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
          </motion.div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
