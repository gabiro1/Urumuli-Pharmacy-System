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

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: numeric('PORT', 4000),

  DB: {
    HOST: required('DB_HOST'),
    PORT: numeric('DB_PORT', 5432),
    NAME: required('DB_NAME'),
    USER: required('DB_USER'),
    PASSWORD: required('DB_PASSWORD'),
    MAX_POOL: numeric('DB_MAX_POOL', 20),
  },

  REDIS: {
    HOST: required('REDIS_HOST'),
    PORT: numeric('REDIS_PORT', 6379),
    PASSWORD: optional('REDIS_PASSWORD', ''),
  },

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
  ORDER_SIGNING_SECRET: optional('ORDER_SIGNING_SECRET', optional('JWT_SECRET', '')),
  RESERVATION_MINUTES: numeric('RESERVATION_MINUTES', 30),
};
