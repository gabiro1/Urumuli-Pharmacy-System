import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  FileCheck,
  ShieldCheck,
  BadgeCheck,
  BadgeX,
  BadgeAlert,
  Clock,
  Loader2,
  Save,
  Send,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Info,
  Calendar,
  GraduationCap,
  Stethoscope,
} from 'lucide-react'
import api from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ============================================================
// CONSTANTS
// ============================================================

const VERIFICATION_STATES = {
  PENDING: {
    label: 'Pending Review',
    color: 'yellow',
    icon: Clock,
    description: 'Your credentials have been submitted and are awaiting administrator review.',
  },
  VERIFIED: {
    label: 'Verified',
    color: 'green',
    icon: BadgeCheck,
    description: 'Your professional credentials have been verified. You have full access to professional features.',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'red',
    icon: BadgeX,
    description: 'Your credentials were rejected. Please review the feedback and resubmit.',
  },
  SUSPENDED: {
    label: 'Suspended',
    color: 'orange',
    icon: BadgeAlert,
    description: 'Your professional verification has been suspended. Contact an administrator.',
  },
  EXPIRED: {
    label: 'Expired',
    color: 'red',
    icon: BadgeAlert,
    description: 'Your professional license has expired. Please update your credentials.',
  },
}

// ============================================================
// STATUS BANNER
// ============================================================

function StatusBanner({ status, profile }) {
  if (!status) return null

  const config = VERIFICATION_STATES[status] || VERIFICATION_STATES.PENDING
  const Icon = config.icon

  const colorMap = {
    yellow: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30',
    green: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30',
    red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30',
    orange: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30',
  }

  const iconColorMap = {
    yellow: 'text-yellow-600 dark:text-yellow-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    orange: 'text-orange-600 dark:text-orange-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        colorMap[config.color]
      )}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', iconColorMap[config.color])} />
      <div className="flex-1">
        <p className="text-sm font-semibold">{config.label}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
        {profile?.verification_notes && status !== 'VERIFIED' && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            Note: {profile.verification_notes}
          </p>
        )}
        {profile?.rejection_reason && (
          <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">Rejection reason:</p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">{profile.rejection_reason}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================
// VERIFICATION TIMELINE
// ============================================================

function VerificationTimeline({ profile }) {
  if (!profile) return null

  const steps = [
    {
      label: 'Credentials Submitted',
      done: true,
      date: profile.created_at,
    },
    {
      label: 'Under Review',
      done: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED'].includes(profile.verification_status),
      date: profile.verification_status !== 'PENDING' ? profile.updated_at : null,
    },
    {
      label: profile.verification_status === 'VERIFIED' ? 'Verified' :
             profile.verification_status === 'REJECTED' ? 'Rejected' :
             profile.verification_status === 'SUSPENDED' ? 'Suspended' :
             profile.verification_status === 'EXPIRED' ? 'Expired' :
             'Pending Decision',
      done: ['VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED'].includes(profile.verification_status),
      date: profile.verified_at,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Verification Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 relative">
              {i < steps.length - 1 && (
                <div className="absolute left-[11px] top-6 w-0.5 h-full bg-border" />
              )}
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10',
                step.done
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground border-2 border-border'
              )}>
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  !step.done && 'text-muted-foreground'
                )}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(step.date)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// CREDENTIALS FORM
// ============================================================

function CredentialsForm({ profile, onSubmit, isSubmitting }) {
  const [form, setForm] = useState({
    professionalRegistrationNumber: '',
    licenseNumber: '',
    licenseExpiry: '',
    licenseIssuingAuthority: 'National Pharmacy Council of Rwanda',
    qualification: '',
    specialization: '',
    yearsOfExperience: '',
  })

  const [confirmSubmit, setConfirmSubmit] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        professionalRegistrationNumber: profile.professional_registration_number || '',
        licenseNumber: profile.license_number || '',
        licenseExpiry: profile.license_expiry ? profile.license_expiry.split('T')[0] : '',
        licenseIssuingAuthority: profile.license_issuing_authority || 'National Pharmacy Council of Rwanda',
        qualification: profile.qualification || '',
        specialization: profile.specialization || '',
        yearsOfExperience: profile.years_of_experience != null ? String(profile.years_of_experience) : '',
      })
    }
  }, [profile])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setConfirmSubmit(true)
  }

  const handleConfirm = () => {
    setConfirmSubmit(false)
    const payload = { ...form }
    if (payload.yearsOfExperience) {
      payload.yearsOfExperience = parseInt(payload.yearsOfExperience, 10)
    } else {
      delete payload.yearsOfExperience
    }
    if (!payload.licenseExpiry) delete payload.licenseExpiry
    onSubmit(payload)
  }

  const isResubmission = profile && ['REJECTED', 'EXPIRED'].includes(profile.verification_status)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Professional Credentials
          </CardTitle>
          <CardDescription>
            {isResubmission
              ? 'Update and resubmit your credentials for verification.'
              : profile
              ? 'Review your submitted credentials. Contact an administrator to make changes.'
              : 'Submit your professional credentials for verification. This is required to access professional pharmacy features.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Registration Number */}
            <div className="space-y-2">
              <Label htmlFor="regNumber" className="flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5" />
                Professional Registration Number
              </Label>
              <Input
                id="regNumber"
                placeholder="e.g. NPC/2024/00123"
                value={form.professionalRegistrationNumber}
                onChange={handleChange('professionalRegistrationNumber')}
                disabled={!isResubmission && !!profile}
              />
              <p className="text-xs text-muted-foreground">
                Your registration number with the National Pharmacy Council of Rwanda
              </p>
            </div>

            {/* License Number */}
            <div className="space-y-2">
              <Label htmlFor="licenseNumber" className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" />
                License Number
              </Label>
              <Input
                id="licenseNumber"
                placeholder="e.g. PHA/RW/2024/456"
                value={form.licenseNumber}
                onChange={handleChange('licenseNumber')}
                disabled={!isResubmission && !!profile}
              />
              <p className="text-xs text-muted-foreground">
                Your official pharmacy practice license number
              </p>
            </div>

            {/* License Expiry + Issuing Authority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseExpiry" className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  License Expiry Date
                </Label>
                <Input
                  id="licenseExpiry"
                  type="date"
                  value={form.licenseExpiry}
                  onChange={handleChange('licenseExpiry')}
                  disabled={!isResubmission && !!profile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issuingAuthority">Issuing Authority</Label>
                <Input
                  id="issuingAuthority"
                  value={form.licenseIssuingAuthority}
                  onChange={handleChange('licenseIssuingAuthority')}
                  disabled={!isResubmission && !!profile}
                />
              </div>
            </div>

            <Separator />

            {/* Qualification */}
            <div className="space-y-2">
              <Label htmlFor="qualification" className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Qualification
              </Label>
              <Input
                id="qualification"
                placeholder="e.g. Bachelor of Pharmacy, PharmD"
                value={form.qualification}
                onChange={handleChange('qualification')}
                disabled={!isResubmission && !!profile}
              />
            </div>

            {/* Specialization + Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  placeholder="e.g. Clinical Pharmacy, Community Pharmacy"
                  value={form.specialization}
                  onChange={handleChange('specialization')}
                  disabled={!isResubmission && !!profile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 5"
                  value={form.yearsOfExperience}
                  onChange={handleChange('yearsOfExperience')}
                  disabled={!isResubmission && !!profile}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                {profile
                  ? 'Only rejected or expired profiles can be resubmitted.'
                  : 'All fields marked are recommended for faster verification.'}
              </p>
              <Button
                type="submit"
                disabled={isSubmitting || (!isResubmission && !!profile)}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                ) : isResubmission ? (
                  <><Send className="w-4 h-4 mr-2" />Resubmit for Review</>
                ) : !profile ? (
                  <><Send className="w-4 h-4 mr-2" />Submit for Verification</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" />Submitted</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Submit for Verification?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your professional credentials will be submitted for administrator review.
              You will not be able to modify them until a decision is made.
              Verification typically takes 1-3 business days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Confirm Submission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ProfessionalCredentialsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  // Fetch my professional profile
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['professional-profile-me'],
    queryFn: () => api.get('/pharmacies/professional/me').then((r) => r.data?.data),
    retry: false, // 404 is expected if no profile exists
  })

  // Submit mutation (POST for new, PUT for update)
  const submitMutation = useMutation({
    mutationFn: (data) => {
      if (profile) {
        return api.put('/pharmacies/professional/me', data)
      }
      return api.post('/pharmacies/professional/submit', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-profile-me'] })
      toast.success(
        profile
          ? 'Credentials updated and resubmitted for review'
          : 'Credentials submitted for verification'
      )
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to submit credentials'
      toast.error(msg)
    },
  })

  const handleSubmit = (data) => {
    submitMutation.mutate(data)
  }

  // Check if user is a pharmacist
  const isPharmacist = user?.role === 'PHARMACIST'

  if (!isPharmacist) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 gap-4"
      >
        <div className="p-4 rounded-2xl bg-muted">
          <ShieldCheck className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Not Available</h2>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          Professional credential submission is only available for users with the Pharmacist role.
        </p>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle 404 (no profile yet) — treat as "no profile"
  const hasProfile = profile && !isError
  const verificationStatus = hasProfile ? profile.verification_status : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Professional Credentials</h1>
        <p className="text-muted-foreground mt-1">
          Manage your pharmacy license and professional verification
        </p>
      </div>

      {/* Status Banner */}
      <StatusBanner status={verificationStatus} profile={hasProfile ? profile : null} />

      {/* Error state (non-404) */}
      {isError && error?.response?.status !== 404 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load profile</p>
            <p className="text-xs text-muted-foreground">
              {error?.response?.data?.message || 'An unexpected error occurred'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form — takes 2 columns */}
        <div className="lg:col-span-2">
          <CredentialsForm
            profile={hasProfile ? profile : null}
            onSubmit={handleSubmit}
            isSubmitting={submitMutation.isPending}
          />
        </div>

        {/* Sidebar — timeline + info */}
        <div className="space-y-4">
          <VerificationTimeline profile={hasProfile ? profile : null} />

          {/* Info Card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-primary" />
                How Verification Works
              </h4>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Submit your professional credentials</li>
                <li>An administrator reviews your documents</li>
                <li>If approved, your status becomes <strong>Verified</strong></li>
                <li>Verified pharmacists can access professional features like patient consultation</li>
              </ol>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Required for verification:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Professional registration number</li>
                  <li>Valid license number</li>
                  <li>Non-expired license</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* License Expiry Warning */}
          {hasProfile && profile.license_expiry && (
            (() => {
              const expiry = new Date(profile.license_expiry)
              const now = new Date()
              const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))

              if (daysUntilExpiry < 0) {
                return (
                  <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <BadgeAlert className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            License Expired
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Your license expired on {formatDate(profile.license_expiry)}.
                            Professional features have been restricted.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              }

              if (daysUntilExpiry <= 90) {
                return (
                  <Card className="border-yellow-200 dark:border-yellow-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                            License Expiring Soon
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Your license expires in {daysUntilExpiry} days ({formatDate(profile.license_expiry)}).
                            Please renew to avoid disruption.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              }

              return null
            })()
          )}
        </div>
      </div>
    </motion.div>
  )
}
