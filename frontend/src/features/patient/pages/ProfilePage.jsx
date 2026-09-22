import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, ImagePlus, Loader2, User, Save } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { usePatientAuthStore } from '@/stores/patientAuthStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getMediaUrl } from '@/lib/media'
import { PatientPageHeader, PatientPageShell } from '../components/PatientPageShell'

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { user, updateProfile, updateAvatar } = usePatientAuthStore()
  const [form, setForm] = useState({})
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const avatarInputRef = useRef(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: () => api.get('/auth/patient/profile').then((r) => r.data.data),
  })

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        dateOfBirth: profile.date_of_birth?.split('T')[0] || '',
        gender: profile.gender || '',
        address: profile.address || '',
        emergencyContactName: profile.emergency_contact_name || '',
        emergencyContactPhone: profile.emergency_contact_phone || '',
        bloodGroup: profile.blood_group || '',
        allergiesNotes: profile.allergies_notes || '',
        chronicConditions: profile.chronic_conditions || '',
      })
    }
  }, [profile])

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const updateMutation = useMutation({
    mutationFn: (data) => updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['patient-profile'], updatedProfile)
      queryClient.invalidateQueries({ queryKey: ['patient-profile'] })
      toast.success('Profile updated')
    },
    onError: (error) => {
      const response = error?.response?.data
      const fieldError = response?.details?.[0]?.message
      toast.error(fieldError || response?.message || response?.error || 'Failed to update profile')
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData()
      formData.append('avatar', file)
      return api.post('/auth/patient/profile/avatar', formData).then((r) => r.data.data)
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['patient-profile'], updatedProfile)
      updateAvatar(updatedProfile.avatar)
      setAvatarFile(null)
      setAvatarPreview(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      toast.success('Profile photo updated')
    },
    onError: (error) => {
      const response = error?.response?.data
      toast.error(response?.message || response?.error || 'Failed to upload profile photo')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Choose a JPG, PNG, WebP, or GIF image')
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile photos must be 5 MB or smaller')
      event.target.value = ''
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const profileName = [profile?.first_name || user?.firstName, profile?.last_name || user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  const profileInitials = profileName
    .split(' ')
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'P'
  const avatarUrl = avatarPreview || getMediaUrl(profile?.avatar || user?.avatar)

  if (isLoading) {
    return (
      <PatientPageShell className="max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Card className="mt-7 rounded-2xl border-border/70 shadow-sm">
          <CardContent className="space-y-4 p-5 sm:p-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </PatientPageShell>
    )
  }

  return (
    <PatientPageShell className="max-w-3xl">
      <PatientPageHeader
        eyebrow="Your profile"
        title="Health profile"
        description="Keep your personal and health information current so the pharmacy team can support you safely."
      />

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar className="h-24 w-24 shrink-0 border-4 border-primary/10 bg-primary/5 text-2xl">
            <AvatarImage src={avatarUrl} alt={profileName || 'Profile photo'} />
            <AvatarFallback className="bg-primary/10 text-primary">{profileInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">Profile photo</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Add a clear photo so your account is easy to recognize. It will appear in the profile circle in the navbar.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleAvatarChange}
              />
              <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}>
                {avatarFile ? <ImagePlus className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                {avatarFile ? 'Choose another' : 'Choose photo'}
              </Button>
              {avatarFile && (
                <Button
                  type="button"
                  onClick={() => uploadAvatarMutation.mutate(avatarFile)}
                  disabled={uploadAvatarMutation.isPending}
                >
                  {uploadAvatarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {uploadAvatarMutation.isPending ? 'Uploading...' : 'Upload photo'}
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP, or GIF · maximum 5 MB</p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={form.firstName || ''} onChange={handleChange('firstName')} required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={form.lastName || ''} onChange={handleChange('lastName')} required maxLength={100} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={handleChange('email')} required />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={form.phone || ''} onChange={handleChange('phone')} placeholder="e.g. +250 788 000 000" />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth || ''}
                  onChange={handleChange('dateOfBirth')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={form.gender || ''}
                  onChange={handleChange('gender')}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address || ''}
                onChange={handleChange('address')}
                rows={2}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Input
                id="bloodGroup"
                value={form.bloodGroup || ''}
                onChange={handleChange('bloodGroup')}
                placeholder="e.g. A+, O-"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergiesNotes">Allergies</Label>
              <Textarea
                id="allergiesNotes"
                value={form.allergiesNotes || ''}
                onChange={handleChange('allergiesNotes')}
                placeholder="List any allergies you have..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chronicConditions">Chronic Conditions</Label>
              <Textarea
                id="chronicConditions"
                value={form.chronicConditions || ''}
                onChange={handleChange('chronicConditions')}
                placeholder="Any ongoing health conditions..."
                rows={2}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  value={form.emergencyContactName || ''}
                  onChange={handleChange('emergencyContactName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={form.emergencyContactPhone || ''}
                  onChange={handleChange('emergencyContactPhone')}
                />
              </div>
            </div>

            <Button type="submit" className="h-11 w-full rounded-xl" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PatientPageShell>
  )
}
