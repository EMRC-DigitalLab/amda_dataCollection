// src/shared/services/cache.service.ts

import { redisClient } from "../../config";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean; // Whether to JSON.stringify/parse the data
}

export interface CacheKey {
  key: string;
  ttl?: number;
}

export class CacheService {
  private static instance: CacheService;
  private readonly defaultTTL = 3600; // 1 hour
  private readonly defaultPrefix = 'app';

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generate a cache key from multiple parts
   */
  generateKey(parts: (string | number | undefined)[], prefix?: string): string {
    const cleanParts = parts.filter(part => part !== undefined && part !== null);
    const keyParts = [prefix || this.defaultPrefix, ...cleanParts];
    return keyParts.join(':');
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const {
        ttl = this.defaultTTL,
        serialize = true
      } = options;

      const finalValue = serialize ? JSON.stringify(value) : value as string;
      
      if (ttl > 0) {
        await redisClient.setEx(key, ttl, finalValue);
      } else {
        await redisClient.set(key, finalValue);
      }
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
      // Don't throw error to prevent cache failures from breaking app
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(
    key: string, 
    options: CacheOptions = {}
  ): Promise<T | null> {
    try {
      const { serialize = true } = options;
      
      const value = await redisClient.get(key);
      
      if (value === null) return null;
      
      return serialize ? JSON.parse(value) : value as T;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the data
    const data = await fetchFn();
    
    // Store in cache for next time
    await this.set(key, data, options);
    
    return data;
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error(`Cache DEL PATTERN error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for an existing key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await redisClient.expire(key, ttl);
    } catch (error) {
      console.error(`Cache EXPIRE error for key ${key}:`, error);
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, by: number = 1): Promise<number> {
    try {
      return await redisClient.incrBy(key, by);
    } catch (error) {
      console.error(`Cache INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set multiple keys at once
   */
  async mSet<T>(keyValues: Record<string, T>, options: CacheOptions = {}): Promise<void> {
    try {
      const { serialize = true } = options;
      
      const pipeline = redisClient.multi();
      
      Object.entries(keyValues).forEach(([key, value]) => {
        const finalValue = serialize ? JSON.stringify(value) : value as string;
        pipeline.set(key, finalValue);
        
        if (options.ttl) {
          pipeline.expire(key, options.ttl);
        }
      });
      
      await pipeline.exec();
    } catch (error) {
      console.error('Cache MSET error:', error);
    }
  }

  /**
   * Get multiple keys at once
   */
  async mGet<T>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    try {
      const { serialize = true } = options;
      
      const values = await redisClient.mGet(keys);
      
      return values.map(value => {
        if (value === null) return null;
        return serialize ? JSON.parse(value) : value as T;
      });
    } catch (error) {
      console.error('Cache MGET error:', error);
      return new Array(keys.length).fill(null);
    }
  }

  /**
   * Add item to a set
   */
  async sAdd(key: string, members: string | string[]): Promise<void> {
    try {
      const memberArray = Array.isArray(members) ? members : [members];
      await redisClient.sAdd(key, memberArray);
    } catch (error) {
      console.error(`Cache SADD error for key ${key}:`, error);
    }
  }

  /**
   * Get all members of a set
   */
  async sMembers(key: string): Promise<string[]> {
    try {
      return await redisClient.sMembers(key);
    } catch (error) {
      console.error(`Cache SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Check if member exists in set
   */
  async sIsMember(key: string, member: string): Promise<boolean> {
    try {
      return await redisClient.sIsMember(key, member);
    } catch (error) {
      console.error(`Cache SISMEMBER error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Push item to a list
   */
  async lPush(key: string, values: string | string[]): Promise<void> {
    try {
      const valueArray = Array.isArray(values) ? values : [values];
      await redisClient.lPush(key, valueArray);
    } catch (error) {
      console.error(`Cache LPUSH error for key ${key}:`, error);
    }
  }

  /**
   * Get range from list
   */
  async lRange(key: string, start: number = 0, stop: number = -1): Promise<string[]> {
    try {
      return await redisClient.lRange(key, start, stop);
    } catch (error) {
      console.error(`Cache LRANGE error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Store hash field
   */
  async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      await redisClient.hSet(key, field, value);
    } catch (error) {
      console.error(`Cache HSET error for key ${key}:`, error);
    }
  }

  /**
   * Get hash field
   */
  async hGet(key: string, field: string): Promise<string | null | undefined> {
    try {
      return await redisClient.hGet(key, field);
    } catch (error) {
      console.error(`Cache HGET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get all hash fields and values
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await redisClient.hGetAll(key);
    } catch (error) {
      console.error(`Cache HGETALL error for key ${key}:`, error);
      return {};
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flushAll(): Promise<void> {
    try {
      await redisClient.flushAll();
    } catch (error) {
      console.error('Cache FLUSH ALL error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      return await redisClient.info('memory');
    } catch (error) {
      console.error('Cache STATS error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();