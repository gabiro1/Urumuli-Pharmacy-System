import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        const { user, accessToken, refreshToken } = data.data
        get().setSession(user, accessToken, refreshToken)
        return user
      },

      setSession: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true })
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
      },

      register: async (userData) => {
        const { data } = await api.post('/auth/register', userData)
        return data.data
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {}
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      fetchProfile: async () => {
        const { data } = await api.get('/auth/profile')
        set({ user: data.data, isAuthenticated: true })
        return data.data
      },

      updateTokens: (accessToken, refreshToken, user) =>
        set((state) => ({ accessToken, refreshToken, user: user || state.user, isAuthenticated: true })),

      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      hasRole: (role) => {
        const user = get().user
        return user?.role === role || user?.role === 'ADMIN'
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
