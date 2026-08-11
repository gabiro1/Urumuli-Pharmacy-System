import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Mail, ArrowLeft, CheckCircle2, Pill } from 'lucide-react'
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

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
})

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values) => {
    setIsSubmitting(true)
    try {
      const response = await api.post('/auth/forgot-password', { email: values.email })
      const resetToken = response.data?.data?.resetToken
      if (resetToken) {
        navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`)
        return
      }
      setSubmittedEmail(values.email)
      setIsSuccess(true)
      toast.success('Reset link sent! Check your email.')
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Something went wrong. Please try again.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

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
            <Pill className="w-8 h-8" />
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader className="text-center pb-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="flex justify-center mb-4"
                  >
                    <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </motion.div>
                  <CardTitle className="text-2xl">Check your email</CardTitle>
                  <CardDescription className="text-base mt-2">
                    We&apos;ve sent a password reset link to{' '}
                    <span className="font-medium text-foreground">
                      {submittedEmail}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    The link will expire in 10 minutes. If you don&apos;t see
                    the email, check your spam folder or{' '}
                    <button
                      onClick={() => setIsSuccess(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      try again
                    </button>
                    .
                  </p>
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="flex justify-center mb-4"
                  >
                    <div className="p-3 rounded-full bg-primary/10">
                      <Mail className="w-10 h-10 text-primary" />
                    </div>
                  </motion.div>
                  <CardTitle className="text-2xl">Forgot password?</CardTitle>
                  <CardDescription className="text-base mt-2">
                    No worries. Enter your email and we&apos;ll send you a
                    reset link.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
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

                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending link...
                        </>
                      ) : (
                        'Send reset link'
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to login
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
          </motion.div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
