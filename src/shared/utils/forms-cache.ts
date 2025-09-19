// services/cache.service.ts
interface CacheItem<T> {
  data: T;
  expiry: number;
}

export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 300; // 5 minutes in seconds

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.defaultTTL;
    const expiry = Date.now() + ttl * 1000;

    this.cache.set(key, {
      data: value,
      expiry,
    });
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup(intervalMinutes: number = 5): void {
    setInterval(
      () => {
        this.cleanup();
      },
      intervalMinutes * 60 * 1000
    );
  }
}
