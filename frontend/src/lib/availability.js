export const AVAILABILITY_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PHYSICALLY_AVAILABLE: 'PHYSICALLY_AVAILABLE',
  PHYSICALLY_UNAVAILABLE: 'PHYSICALLY_UNAVAILABLE',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
})

export const availabilityStatusConfig = Object.freeze({
  [AVAILABILITY_STATUS.PENDING]: {
    label: 'Waiting for the pharmacist',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  [AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE]: {
    label: 'Physically available',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  [AVAILABILITY_STATUS.PHYSICALLY_UNAVAILABLE]: {
    label: 'Not physically available',
    dot: 'bg-muted-foreground/50',
    text: 'text-muted-foreground',
  },
  [AVAILABILITY_STATUS.INVENTORY_UPDATED]: {
    label: 'Digital inventory updated',
    dot: 'bg-primary',
    text: 'text-primary',
  },
})

const DRAFT_KEY = 'availabilityDraft'

export function saveAvailabilityDraft(draft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export function getAvailabilityDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY))
  } catch {
    return null
  }
}

export function clearAvailabilityDraft() {
  sessionStorage.removeItem(DRAFT_KEY)
}