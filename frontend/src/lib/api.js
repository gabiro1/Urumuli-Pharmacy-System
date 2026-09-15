import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
})

let refreshPromise = null

function currentWorkspace() {
  if (typeof window === 'undefined') return 'public'
  const path = window.location.pathname
  if (path.startsWith('/patient')) return 'patient'
  if (path.startsWith('/app')) return 'staff'
  return 'public'
}

function sessionKeys() {
  return currentWorkspace() === 'patient'
    ? { access: 'patientAccessToken', refresh: 'patientRefreshToken' }
    : { access: 'accessToken', refresh: 'refreshToken' }
}

async function persistRefreshedSession(data) {
  const workspace = currentWorkspace()
  const keys = sessionKeys()
  localStorage.setItem(keys.access, data.accessToken)
  localStorage.setItem(keys.refresh, data.refreshToken)
  if (workspace === 'patient') {
    const { usePatientAuthStore } = await import('@/stores/patientAuthStore')
    usePatientAuthStore.getState().updateTokens(data.accessToken, data.refreshToken, data.user)
  } else {
    const { useAuthStore } = await import('@/stores/authStore')
    useAuthStore.getState().updateTokens(data.accessToken, data.refreshToken, data.user)
  }
  return data.accessToken
}

async function clearActiveSession() {
  const workspace = currentWorkspace()
  const keys = sessionKeys()
  localStorage.removeItem(keys.access)
  localStorage.removeItem(keys.refresh)
  if (workspace === 'patient') {
    const { usePatientAuthStore } = await import('@/stores/patientAuthStore')
    usePatientAuthStore.getState().clearSession()
  } else {
    const { useAuthStore } = await import('@/stores/authStore')
    useAuthStore.getState().clearSession()
  }
}

api.interceptors.request.use((config) => {
  // Let the browser/Axios generate multipart boundaries for FormData. Forcing
  // application/json here causes uploaded files to arrive as an empty body.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  const keys = sessionKeys()
  const token = localStorage.getItem(keys.access)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem(sessionKeys().refresh)
        if (!refreshToken) throw new Error('No refresh token')

        if (!refreshPromise) {
          refreshPromise = axios.post(
            `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/refresh-token`,
            { refreshToken }
          ).then(({ data }) => persistRefreshedSession(data.data))
            .finally(() => { refreshPromise = null })
        }

        const accessToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        await clearActiveSession()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
