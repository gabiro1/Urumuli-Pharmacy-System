import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

export const usePatientAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        const { user, accessToken, refreshToken } = data.data
        if (user.role !== 'PATIENT') {
          throw new Error('Please use the staff sign-in page for this account.')
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true })
        localStorage.setItem('patientAccessToken', accessToken)
        localStorage.setItem('patientRefreshToken', refreshToken)
        return user
      },

      register: async (userData) => {
        const { data } = await api.post('/auth/register/patient', userData)
        const { user, accessToken, refreshToken } = data.data
        set({ user, accessToken, refreshToken, isAuthenticated: true })
        localStorage.setItem('patientAccessToken', accessToken)
        localStorage.setItem('patientRefreshToken', refreshToken)
        return user
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {}
        localStorage.removeItem('patientAccessToken')
        localStorage.removeItem('patientRefreshToken')
        set({ user: null, profile: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      updateTokens: (accessToken, refreshToken, user) =>
        set((state) => ({ accessToken, refreshToken, user: user || state.user, isAuthenticated: true })),

      clearSession: () =>
        set({ user: null, profile: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      fetchProfile: async () => {
        const { data } = await api.get('/auth/patient/profile')
        set({ profile: data.data })
        return data.data
      },

      updateProfile: async (profileData) => {
        const { data } = await api.put('/auth/patient/profile', profileData)
        const profile = data.data
        set((state) => ({
          profile,
          user: state.user ? {
            ...state.user,
            firstName: profile.first_name ?? state.user.firstName,
            lastName: profile.last_name ?? state.user.lastName,
            email: profile.email ?? state.user.email,
            phone: profile.phone ?? state.user.phone,
          } : state.user,
        }))
        return data.data
      },
    }),
    {
      name: 'patient-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
