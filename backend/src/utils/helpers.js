import crypto from 'crypto';

export function generateUUID() {
  return crypto.randomUUID();
}

export function generateReference(prefix) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('HEX').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

export function parseBoolean(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return ['true', '1', 'yes'].includes(val.toLowerCase());
  return false;
}

export function calculateExpiryStatus(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'EXPIRED';
  if (diffDays <= 30) return 'EXPIRING_SOON';
  if (diffDays <= 90) return 'EXPIRING';
  return 'VALID';
}

export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
