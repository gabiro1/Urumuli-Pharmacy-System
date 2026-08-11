import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';

function createRedisStore(prefix) {
  const client = getRedisClient();
  return new RedisStore({
    sendCommand: (...args) => client.call(...args),
    prefix,
  });
}

export function createRateLimiter(windowMs, max, message, prefix = 'rl:global:', skipFn, options = {}) {
  return rateLimit({
    windowMs: windowMs || env.RATE_LIMIT.WINDOW_MS,
    max: max || env.RATE_LIMIT.MAX,
    message: {
      success: false,
      error: message || 'Too many requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(prefix),
    keyGenerator: (req) => req.user?.userId || req.ip,
    skip: skipFn || ((req) => req.path === '/health'),
    ...options,
  });
}

// Coarse IP-based limit for unauthenticated / public traffic only.
// Bearer-authenticated users are intentionally excluded from this limiter.
export const globalLimiter = createRateLimiter(
  env.RATE_LIMIT.WINDOW_MS,
  env.RATE_LIMIT.MAX,
  undefined,
  'rl:global:',
  (req) => req.path === '/health' || Boolean(req.headers.authorization && req.headers.authorization.startsWith('Bearer '))
);

export const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  'Too many authentication attempts. Please try again after 15 minutes.',
  'rl:auth-failures:v2:',
  undefined,
  // A valid login or password-recovery request should never move a user
  // closer to a lockout. Only unsuccessful responses consume this limit.
  { skipSuccessfulRequests: true }
);
