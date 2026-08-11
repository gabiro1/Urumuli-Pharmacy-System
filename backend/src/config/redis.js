import Redis from 'ioredis';
import { env } from './env.js';

let redisClient;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.REDIS.HOST,
      port: env.REDIS.PORT,
      password: env.REDIS.PASSWORD || undefined,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export async function healthCheckRedis() {
  try {
    const result = await getRedisClient().ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
