import Redis from 'ioredis';
import logger from './logger';

const redisUrl = process.env.NODE_ENV === 'production' 
  ? process.env.REDIS_SERVER_URL 
  : process.env.REDIS_LOCAL_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl!, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    // Fail fast in test environment
    if (process.env.NODE_ENV === 'test') {
      return null;
    }
    // Stop retrying after 10 attempts
    if (times > 10) {
      logger.warn('Redis reconnection failed after 10 attempts. Continuing without cache.');
      return null;
    }
    return Math.min(times * 100, 3000); // Exponential backoff
  }
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

// Intercept duplicate connections (e.g. from BullMQ) to ensure they handle their own errors
const originalDuplicate = redis.duplicate.bind(redis);
redis.duplicate = (...args: unknown[]) => {
  const cloned = originalDuplicate.apply(redis, args as any);
  cloned.on('error', (err: unknown) => {
    if ((err as NodeJS.ErrnoException).code !== 'ECONNREFUSED') {
      logger.error('Cloned Redis connection error:', { error: err });
    }
  });
  return cloned;
};

redis.on('error', (err: unknown) => {
  // Only log error if it's not a connection refused (to avoid spam)
  if ((err as NodeJS.ErrnoException).code !== 'ECONNREFUSED') {
    logger.error('Redis error:', err);
  }
});

export default redis;
