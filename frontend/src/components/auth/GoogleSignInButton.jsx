import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/apiError'
import { useAuthModalStore } from '@/stores/authModalStore'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

let gsiInitialized = false

export default function GoogleSignInButton({ onSuccess, label = 'Continue with Google', className, variant = 'outline' }) {
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const callbackRef = useRef(onSuccess)
  callbackRef.current = onSuccess

  const isConfigured = Boolean(GOOGLE_CLIENT_ID)

  useEffect(() => {
    if (!isConfigured || typeof window === 'undefined') return

    const handleCredentialResponse = async (response) => {
      if (!response?.credential) {
        setError('Google sign-in was cancelled.')
        return
      }
      setBusy(true)
      setError('')
      try {
        const { data } = await api.post('/auth/google', { idToken: response.credential })
        const payload = data.data
        if (payload?.requiresEmailVerification) {
          useAuthModalStore.getState().closeModal()
          const target = payload.verificationLink || '/verify-email'
          if (target.startsWith('http')) {
            window.location.href = target
          } else {
            navigate(target)
          }
          return
        }
        const { user, accessToken, refreshToken } = payload
        const { usePatientAuthStore } = await import('@/stores/patientAuthStore')
        usePatientAuthStore.getState().setSession(user, accessToken, refreshToken)
        callbackRef.current?.(user)
      } catch (err) {
        const message = getApiErrorMessage(err, 'Google sign-in failed. Please try again.')
        setError(message)
        toast.error(message)
      } finally {
        setBusy(false)
      }
    }

    const initialize = () => {
      if (!window.google?.accounts?.id || gsiInitialized) return
      gsiInitialized = true
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        ux_mode: 'popup',
      })
      // Render Google's credential button into an off-screen container so the
      // popup flow can be triggered while keeping the custom visual button.
      if (containerRef.current) {
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'icon',
          shape: 'circle',
          theme: 'outline',
          size: 'large',
        })
      }
    }

    const existing = document.getElementById('gsi-client-script')
    if (existing) {
      initialize()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.id = 'gsi-client-script'
    script.onload = initialize
    document.head.appendChild(script)

    // GIS initializes once per page; leave the script in place for reuse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured])

  const handleClick = () => {
    if (!isConfigured) {
      setError('Google sign-in is not configured yet.')
      return
    }
    if (!window.google?.accounts?.id) {
      setError('Google sign-in could not be loaded. Check your connection and try again.')
      return
    }
    const container = containerRef.current
    if (container && container.children.length > 0) {
      const trigger = container.querySelector('[role="button"]') || container.firstElementChild || container
      trigger.click()
    } else {
      window.google.accounts.id.prompt()
    }
  }

  return (
    <div className={`w-full ${className || ''}`}>
      <Button
        type="button"
        variant={variant}
        className="h-11 w-full"
        onClick={handleClick}
        disabled={busy}
      >
        {busy ? (
          <span className="animate-pulse">Signing in…</span>
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {label}
          </>
        )}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div
        ref={containerRef}
        aria-hidden="true"
        style={{ position: 'fixed', left: '-10000px', top: '0px', width: '200px', height: '1px', overflow: 'hidden' }}
      />
    </div>
  )
}