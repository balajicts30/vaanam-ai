interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    // Keep cache bounded
    if (this.store.size > 500) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  checkRateLimit(clientKey: string, maxRequests = 60, windowSeconds = 60): boolean {
    const now = Date.now();
    const record = this.rateLimitStore.get(clientKey);
    if (!record || now > record.resetAt) {
      this.rateLimitStore.set(clientKey, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
      return true;
    }
    if (record.count >= maxRequests) {
      return false;
    }
    record.count += 1;
    return true;
  }
}

export const serverCache = new MemoryCache();
