import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Loader2, User, Save } from 'lucide-react'
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

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { user, updateProfile } = usePatientAuthStore()
  const [form, setForm] = useState({})

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

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6 max-w-2xl"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Health Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal and health information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

            <div className="grid grid-cols-2 gap-4">
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

            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
