import { Clock3, PackageCheck, PackageX, RefreshCcw, ShieldCheck } from 'lucide-react'
import { AVAILABILITY_STATUS, availabilityStatusConfig } from '@/lib/availability'
import { cn } from '@/lib/utils'

const STATUS_ICONS = {
  [AVAILABILITY_STATUS.PENDING]: Clock3,
  [AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE]: PackageCheck,
  [AVAILABILITY_STATUS.PHYSICALLY_UNAVAILABLE]: PackageX,
  [AVAILABILITY_STATUS.INVENTORY_UPDATED]: RefreshCcw,
}

const STATUS_DESCRIPTIONS = {
  [AVAILABILITY_STATUS.PENDING]: 'The pharmacy team is checking the physical shelves for you.',
  [AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE]: 'A pharmacist confirmed this medicine is available at the pharmacy.',
  [AVAILABILITY_STATUS.PHYSICALLY_UNAVAILABLE]: 'The pharmacy checked the shelves and could not find it right now.',
  [AVAILABILITY_STATUS.INVENTORY_UPDATED]: 'The confirmed quantity is now ready for checkout.',
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AvailabilityStatusBanner({ request }) {
  if (!request) return null

  const status = request.verificationStatus || AVAILABILITY_STATUS.PENDING
  const config = availabilityStatusConfig[status] || availabilityStatusConfig[AVAILABILITY_STATUS.PENDING]
  const Icon = STATUS_ICONS[status] || Clock3
  const available = [AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE, AVAILABILITY_STATUS.INVENTORY_UPDATED].includes(status)
  const iconTone = available
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : status === AVAILABILITY_STATUS.PHYSICALLY_UNAVAILABLE
      ? 'bg-muted text-muted-foreground'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'

  return (
    <div className="border-b border-border/60 bg-card px-3 py-3 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-background px-3.5 py-3 sm:px-4">
          <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', iconTone)}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="truncate text-sm font-semibold text-foreground">{request.medicineName}</p>
              <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold', config.text)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
                {config.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary" />
                Urumuli pharmacist
              </span>
              <span className="hidden text-border sm:inline">·</span>
              <span>{STATUS_DESCRIPTIONS[status]}</span>
            </div>
          </div>

          {(request.physicalStockConfirmed !== null && request.physicalStockConfirmed !== undefined) ||
            (request.quotedUnitPrice !== null && request.quotedUnitPrice !== undefined) ? (
            <div className="hidden shrink-0 text-right sm:block">
              {request.physicalStockConfirmed !== null && request.physicalStockConfirmed !== undefined && (
                <p className="text-xs font-semibold text-foreground">
                  {request.physicalStockConfirmed} available
                </p>
              )}
              {request.quotedUnitPrice !== null && request.quotedUnitPrice !== undefined && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  RWF {Number(request.quotedUnitPrice).toLocaleString()} / {request.sellingUnit || 'unit'}
                </p>
              )}
              {request.verifiedAt && (
                <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(request.verifiedAt)}</p>
              )}
            </div>
          ) : null}
        </div>

        {request.pharmacistNotes && (
          <div className="mt-2 rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-xs text-muted-foreground sm:px-4">
            <span className="font-semibold text-foreground">Pharmacist note:</span> {request.pharmacistNotes}
          </div>
        )}
      </div>
    </div>
  )
}
