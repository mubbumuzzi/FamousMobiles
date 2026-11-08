/**
 * In-memory Stale-While-Revalidate API cache for Famous Mobiles.
 * Enables instant page navigation without skeleton loading flashes.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Default cache validity: 5 minutes
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Synchronously retrieves cached API response data if available and not expired.
 */
export function getCachedApi<T>(path: string): T | undefined {
  if (!path) return undefined;
  const entry = cache.get(path);
  if (!entry) return undefined;

  const isExpired = Date.now() - entry.timestamp > entry.ttl;
  if (isExpired) {
    cache.delete(path);
    return undefined;
  }

  return entry.data as T;
}

/**
 * Stores API response data in the in-memory cache.
 */
export function setCachedApi<T>(path: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void {
  if (!path || data === undefined || data === null) return;
  cache.set(path, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Invalidates cache entries matching a path prefix or RegExp.
 * If no pattern is provided, clears the entire cache.
 */
export function invalidateApiCache(pattern?: string | RegExp): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of Array.from(cache.keys())) {
    if (typeof pattern === "string") {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    } else if (pattern.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Clears the entire API cache.
 */
export function clearApiCache(): void {
  cache.clear();
}
