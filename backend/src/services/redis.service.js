import { getRedisClient } from '../config/redis.js';

const DEFAULT_TTL = 300;
const LONG_TTL = 3600;

export async function cacheGet(key) {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis cacheGet error:', error);
    return null;
  }
}

export async function cacheSet(key, value, ttl = DEFAULT_TTL) {
  try {
    const client = getRedisClient();
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Redis cacheSet error:', error);
  }
}

export async function cacheDel(pattern) {
  try {
    const client = getRedisClient();
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch (error) {
    console.error('Redis cacheDel error:', error);
  }
}

export async function cacheDelKey(key) {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('Redis cacheDelKey error:', error);
  }
}

export async function cacheRemember(key, ttl, fetchFn) {
  const cached = await cacheGet(key);
  if (cached) return cached;

  const fresh = await fetchFn();
  if (fresh) {
    await cacheSet(key, fresh, ttl);
  }
  return fresh;
}

export async function storeSession(sessionId, data, ttl = LONG_TTL) {
  await cacheSet(`session:${sessionId}`, data, ttl);
}

export async function getSession(sessionId) {
  return cacheGet(`session:${sessionId}`);
}

export async function destroySession(sessionId) {
  await cacheDel(`session:${sessionId}`);
}

export async function acquireLock(resource, ttl = 10) {
  try {
    const client = getRedisClient();
    const lockKey = `lock:${resource}`;
    const acquired = await client.set(lockKey, 'locked', 'NX', 'EX', ttl);
    return acquired === 'OK';
  } catch (error) {
    console.error('Redis acquireLock error:', error);
    return false;
  }
}

export async function releaseLock(resource) {
  try {
    const client = getRedisClient();
    await client.del(`lock:${resource}`);
  } catch (error) {
    console.error('Redis releaseLock error:', error);
  }
}

export const MEDICINE_CACHE_KEY = 'medicines:list';
export const MEDICINE_DETAIL_KEY = (id) => `medicines:detail:${id}`;
export const CATEGORIES_KEY = 'categories:list';
export const SUPPLIERS_KEY = 'suppliers:list';

export async function invalidateMedicineCache() {
  await cacheDel('medicines:*');
}

export async function invalidateCategoryCache() {
  await cacheDel('categories:*');
}

export async function invalidatePartnerCache() {
  await cacheDel('partners:*');
}

export async function invalidateCannedReplyCache() {
  await cacheDel('canned_replies:*');
}

export { DEFAULT_TTL, LONG_TTL };
