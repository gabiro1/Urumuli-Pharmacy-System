const configuredApiUrl = import.meta.env.VITE_API_URL || '';

export function getMediaUrl(value) {
  if (!value) return undefined;
  if (/^(https?:|data:|blob:|\/\/)/i.test(value)) return value;

  if (!configuredApiUrl) return value;

  try {
    const apiUrl = new URL(configuredApiUrl, window.location.origin);
    return new URL(value, apiUrl.origin).toString();
  } catch {
    return value;
  }
}
