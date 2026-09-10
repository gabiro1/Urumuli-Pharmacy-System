import Redis from 'ioredis';
import { env } from './env.js';

let redisClient;

export function getRedisClient() {
  if (!redisClient) {
    const defaults = {
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    };

    const config = env.REDIS.URL
      ? { ...defaults, ...parseRedisUrl(env.REDIS.URL) }
      : {
          ...defaults,
          host: env.REDIS.HOST,
          port: env.REDIS.PORT,
          password: env.REDIS.PASSWORD || undefined,
        };

    redisClient = new Redis(config);

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  return redisClient;
}

function parseRedisUrl(url) {
  const parsed = new URL(url);
  const config = {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
  };
  if (parsed.password) config.password = decodeURIComponent(parsed.password);
  if (parsed.username) config.username = decodeURIComponent(parsed.username);
  const db = parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) : 0;
  if (!Number.isNaN(db)) config.db = db;
  if (parsed.protocol === 'rediss:') config.tls = {};
  return config;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export async function healthCheckRedis() {
  try {
    const result = await Promise.race([
      getRedisClient().ping(),
      new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 5000)),
    ]);
    return result === 'PONG';
  } catch {
    return false;
  }
}
