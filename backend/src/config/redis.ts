import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Redis client using ioredis
// ---------------------------------------------------------------------------

let redisClient: import('ioredis').default | null = null;

function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

async function getClient(): Promise<import('ioredis').default> {
  if (redisClient) return redisClient;

  // Dynamic import so the app still boots if ioredis isn't installed yet
  const Redis = (await import('ioredis')).default;

  const url = getRedisUrl();
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = parseInt(process.env.REDIS_DB || '0', 10);

  redisClient = new Redis(url, {
    password: password || undefined,
    db,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  await redisClient.connect();
  return redisClient;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface RedisHealthResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

async function checkHealth(): Promise<RedisHealthResult> {
  const start = Date.now();
  try {
    const client = await getClient();
    const pong = await client.ping();
    return {
      healthy: pong === 'PONG',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function close(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const redis = {
  getClient,
  checkHealth,
  close,
};
