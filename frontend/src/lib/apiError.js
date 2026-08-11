export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const response = error?.response?.data
  const details = Array.isArray(response?.details)
    ? response.details
        .map((detail) => detail?.field ? `${detail.field}: ${detail.message}` : detail?.message)
        .filter(Boolean)
        .join(', ')
    : ''

  return details || response?.error || response?.message || error?.message || fallback
}
