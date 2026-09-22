import { useState } from 'react'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TwoFactorChallenge({ email, onSubmit, onBack, isSubmitting, error }) {
  const [code, setCode] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(code.trim())
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <p className="font-medium">Staff verification required</p>
          <p className="text-sm text-muted-foreground">
            Enter the six-digit code from your authenticator app for {email}.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="two-factor-code">Authentication code</Label>
          <Input
            id="two-factor-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 12))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            autoFocus
            required
          />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={isSubmitting || code.trim().length < 6}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          {isSubmitting ? 'Verifying…' : 'Verify and sign in'}
        </Button>
      </form>

      <Button type="button" variant="ghost" className="w-full" onClick={onBack} disabled={isSubmitting}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to password sign in
      </Button>
    </div>
  )
}

