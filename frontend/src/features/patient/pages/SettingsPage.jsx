import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Bell, Shield, Lock, Save, RotateCcw, User, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { usePatientAuthStore } from '@/stores/patientAuthStore'

const defaultSettings = {
  prescriptionUpdates: true,
  messageAlerts: true,
  appointmentReminders: true,
  marketingEmails: false,
  shareReadReceipts: true,
  compactView: false,
}

function normalizeSettings(settings) {
  return {
    prescriptionUpdates: settings?.prescriptionUpdates ?? defaultSettings.prescriptionUpdates,
    messageAlerts: settings?.messageAlerts ?? defaultSettings.messageAlerts,
    appointmentReminders: settings?.appointmentReminders ?? defaultSettings.appointmentReminders,
    marketingEmails: settings?.marketingEmails ?? defaultSettings.marketingEmails,
    shareReadReceipts: settings?.shareReadReceipts ?? defaultSettings.shareReadReceipts,
    compactView: settings?.compactView ?? defaultSettings.compactView,
  }
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-card p-4 hover:bg-accent/30 transition-colors">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
    </label>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = usePatientAuthStore()
  const [settings, setSettings] = useState(defaultSettings)

  const {
    data: settingsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['patient-settings'],
    queryFn: () => api.get('/auth/patient/settings').then((r) => r.data.data),
  })

  useEffect(() => {
    if (settingsData) {
      setSettings(normalizeSettings(settingsData))
    }
  }, [settingsData])

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/auth/patient/settings', payload).then((r) => r.data.data),
    onSuccess: (data) => {
      const normalized = normalizeSettings(data)
      setSettings(normalized)
      queryClient.setQueryData(['patient-settings'], data)
      toast.success('Settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const updateSetting = (key) => (value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    saveMutation.mutate(settings)
  }

  const handleReset = () => {
    setSettings(defaultSettings)
    saveMutation.mutate(defaultSettings)
  }

  const handleSignOut = async () => {
    await logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
    : 'P'

  if (isLoading) {
    return <SettingsSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="p-4 rounded-full bg-destructive/10">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Failed to load settings</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          The patient settings API could not be reached. Try again to reload your preferences.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6 max-w-4xl"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Control how the patient portal behaves for this browser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saveMutation.isPending}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {user ? `${user.firstName} ${user.lastName}` : 'Patient'}
                </h2>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  Patient
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              title="Prescription updates"
              description="Get notified when a prescription changes status."
              checked={settings.prescriptionUpdates}
              onChange={updateSetting('prescriptionUpdates')}
            />
            <ToggleRow
              title="Message alerts"
              description="Receive alerts when the pharmacy replies to your chat."
              checked={settings.messageAlerts}
              onChange={updateSetting('messageAlerts')}
            />
            <ToggleRow
              title="Appointment reminders"
              description="Be reminded about upcoming pharmacy follow-ups."
              checked={settings.appointmentReminders}
              onChange={updateSetting('appointmentReminders')}
            />
            <ToggleRow
              title="Marketing emails"
              description="Receive updates about promotions and service announcements."
              checked={settings.marketingEmails}
              onChange={updateSetting('marketingEmails')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Privacy and chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              title="Read receipts"
              description="Let the pharmacy know when you have seen a message."
              checked={settings.shareReadReceipts}
              onChange={updateSetting('shareReadReceipts')}
            />
            <ToggleRow
              title="Compact view"
              description="Use a denser layout for lists and cards in this browser."
              checked={settings.compactView}
              onChange={updateSetting('compactView')}
            />

            <Separator className="my-4" />

            <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Security note</p>
              </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                These preferences are stored on the server for your account. Password changes and
                account-level controls should still be handled from the patient profile area or
                backend auth flow.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate('/patient/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Open Profile
                </Button>
                <Button variant="destructive" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
