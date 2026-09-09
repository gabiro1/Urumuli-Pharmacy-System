import crypto from 'crypto';

const STEP_SECONDS = 30;
const DIGITS = 6;
const ALGORITHM = 'sha1';

export function generateSecret(length = 20) {
  return crypto.randomBytes(length).toString('base64').replace(/=+$/g, '');
}

export function totp(secret, { timeStep = STEP_SECONDS, digits = DIGITS, timestamp = Date.now() } = {}) {
  const counter = Math.floor(timestamp / 1000 / timeStep);

  const key = Buffer.from(secret, 'base64');
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac(ALGORITHM, key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (binary % Math.pow(10, digits)).toString().padStart(digits, '0');
  return otp;
}

export function verifyTotp(secret, code, { window = 1, timestamp = Date.now() } = {}) {
  if (!secret || !code) return false;
  const expected = String(code).trim();
  if (!/^\d+$/.test(expected)) return false;

  for (let i = -window; i <= window; i++) {
    const candidate = totp(secret, { timestamp: timestamp + i * STEP_SECONDS * 1000 });
    if (candidate === expected) return true;
  }
  return false;
}

export function generateBackupCodes(count = 8, length = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length));
  }
  return codes;
}

export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(String(code).toUpperCase()).digest('hex');
}
