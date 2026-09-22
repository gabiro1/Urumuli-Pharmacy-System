import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key, defaultValue) {
  return process.env[key] || defaultValue;
}

function numeric(key, defaultValue) {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function trueish(value) {
  if (value === undefined || value === '') return undefined;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseConnectionUrl(url) {
  const parsed = new URL(url);
  return {
    HOST: parsed.hostname,
    PORT: parsed.port ? parseInt(parsed.port, 10) : 5432,
    NAME: parsed.pathname.replace(/^\//, ''),
    USER: parsed.username ? decodeURIComponent(parsed.username) : '',
    PASSWORD: parsed.password ? decodeURIComponent(parsed.password) : '',
  };
}

function resolveDatabaseConfig() {
  const url = optional('DATABASE_URL', optional('POSTGRES_URL', ''));
  const useUrl = trueish(process.env.DB_USE_URL);

  if (url && useUrl !== false) {
    const parsed = parseConnectionUrl(url);
    const sslOverride = trueish(process.env.DB_SSL);
    return {
      ...parsed,
      URL: url,
      MAX_POOL: numeric('DB_MAX_POOL', 20),
      // Managed providers (Render/Supabase/Neon) require SSL. Allow override via DB_SSL.
      SSL: sslOverride === undefined ? true : sslOverride,
    };
  }

  return {
    HOST: required('DB_HOST'),
    PORT: numeric('DB_PORT', 5432),
    NAME: required('DB_NAME'),
    USER: required('DB_USER'),
    PASSWORD: required('DB_PASSWORD'),
    URL: '',
    MAX_POOL: numeric('DB_MAX_POOL', 20),
    SSL: trueish(process.env.DB_SSL) === true,
  };
}

function resolveRedisConfig() {
  const url = optional('REDIS_URL', '');
  const host = process.env.REDIS_HOST;
  if (url) {
    return { URL: url, CONFIGURED: true };
  }
  return {
    HOST: optional('REDIS_HOST', 'localhost'),
    PORT: numeric('REDIS_PORT', 6379),
    PASSWORD: optional('REDIS_PASSWORD', ''),
    CONFIGURED: Boolean(host),
  };
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: numeric('PORT', 4000),

  DB: resolveDatabaseConfig(),

  REDIS: resolveRedisConfig(),

  JWT: {
    SECRET: required('JWT_SECRET'),
    ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  UPLOAD_DIR: optional('UPLOAD_DIR', './uploads'),
  MAX_FILE_SIZE: numeric('MAX_FILE_SIZE', 10485760),
  MAX_PRESCRIPTION_FILES: numeric('MAX_PRESCRIPTION_FILES', 3),

  ENCRYPTION_KEY: optional('ENCRYPTION_KEY', ''),

  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:5173'),

  RATE_LIMIT: {
    WINDOW_MS: numeric('RATE_LIMIT_WINDOW_MS', 900000),
    MAX: numeric('RATE_LIMIT_MAX', 100),
  },
  OTP: {
    TTL_SECONDS: numeric('OTP_TTL_SECONDS', 300),
    MAX_ATTEMPTS: numeric('OTP_MAX_ATTEMPTS', 5),
    RESEND_COOLDOWN_SECONDS: numeric('OTP_RESEND_COOLDOWN_SECONDS', 60),
    PROVIDER: optional('OTP_PROVIDER', 'development'),
  },
  SMS_PROVIDER: optional('SMS_PROVIDER', 'development'),
  PAYMENT_PROVIDER: optional('PAYMENT_PROVIDER', 'development'),
  PAYMENT_CURRENCY: optional('PAYMENT_CURRENCY', 'RWF'),
  PAYMENT_WEBHOOK_SECRET: optional('PAYMENT_WEBHOOK_SECRET', ''),
  PAYMENT_SANDBOX_DELAY_MS: numeric('PAYMENT_SANDBOX_DELAY_MS', 5000),
  PAYMENT_MTN_MOMO_HOST: optional('PAYMENT_MTN_MOMO_HOST', ''),
  PAYMENT_MTN_MOMO_ENVIRONMENT: optional('PAYMENT_MTN_MOMO_ENVIRONMENT', 'sandbox'),
  PAYMENT_MTN_MOMO_SUBSCRIPTION_KEY: optional('PAYMENT_MTN_MOMO_SUBSCRIPTION_KEY', ''),
  PAYMENT_MTN_MOMO_API_USER: optional('PAYMENT_MTN_MOMO_API_USER', ''),
  PAYMENT_MTN_MOMO_API_KEY: optional('PAYMENT_MTN_MOMO_API_KEY', ''),
  PAYMENT_AIRTEL_HOST: optional('PAYMENT_AIRTEL_HOST', ''),
  PAYMENT_AIRTEL_APP_ID: optional('PAYMENT_AIRTEL_APP_ID', ''),
  PAYMENT_AIRTEL_APP_KEY: optional('PAYMENT_AIRTEL_APP_KEY', ''),
  PAYMENT_AIRTEL_COUNTRY: optional('PAYMENT_AIRTEL_COUNTRY', 'RW'),
  PAYMENT_CARD_PROCESSING_URL: optional('PAYMENT_CARD_PROCESSING_URL', ''),
  PAYMENT_CARD_SECRET_KEY: optional('PAYMENT_CARD_SECRET_KEY', ''),
  ORDER_SIGNING_SECRET: optional('ORDER_SIGNING_SECRET', optional('JWT_SECRET', '')),
  RESERVATION_MINUTES: numeric('RESERVATION_MINUTES', 30),

  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID', ''),

  EMAIL: {
    USER: optional('EMAIL_USER', ''),
    APP_PASSWORD: optional('EMAIL_APP_PASSWORD', ''),
    FROM: optional('EMAIL_FROM', ''),
    VERIFICATION_TTL_MS: numeric('EMAIL_VERIFICATION_TTL_MS', 24 * 60 * 60 * 1000),
  },

  PUBLIC_URL: optional('PUBLIC_URL', 'http://localhost:5173'),
};
