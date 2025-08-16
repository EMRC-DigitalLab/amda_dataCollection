// src/config/redis.ts
import { createClient, RedisClientType } from 'redis';
import { config } from './environment';

const redisConfig = {
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

export const redisClient: RedisClientType = createClient(redisConfig);

redisClient.on('error', err => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log(`📡 Connected to Redis: ${config.redis.host}:${config.redis.port}`);
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    // Don't exit process for Redis failure in development
    if (config.environment === 'production') {
      process.exit(1);
    }
  }
};

export const closeRedis = async (): Promise<void> => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('🔌 Redis connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
  }
};
