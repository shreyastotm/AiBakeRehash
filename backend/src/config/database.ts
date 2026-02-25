import { Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULTS = {
  poolMin: 2,
  poolMax: 20,
  idleTimeoutMs: 30_000,
  connectionTimeoutMs: 5_000,
  statementTimeoutMs: 30_000,
  retryAttempts: 5,
  retryBaseDelayMs: 500,
  retryMaxDelayMs: 30_000,
  healthCheckIntervalMs: 30_000,
} as const;

function buildPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    connectionString,
    min: parseInt(process.env.DATABASE_POOL_MIN || String(DEFAULTS.poolMin), 10),
    max: parseInt(process.env.DATABASE_POOL_MAX || String(DEFAULTS.poolMax), 10),
    idleTimeoutMillis: DEFAULTS.idleTimeoutMs,
    connectionTimeoutMillis: DEFAULTS.connectionTimeoutMs,
    statement_timeout: DEFAULTS.statementTimeoutMs,
  };
}

// ---------------------------------------------------------------------------
// Pool singleton
// ---------------------------------------------------------------------------

let pool: Pool | null = null;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

function createPool(): Pool {
  const config = buildPoolConfig();
  const newPool = new Pool(config);

  // Pool-level event listeners for monitoring
  newPool.on('connect', () => {
    logger.debug('New client connected to the pool');
  });

  newPool.on('acquire', () => {
    logger.debug(
      { total: newPool.totalCount, idle: newPool.idleCount, waiting: newPool.waitingCount },
      'Client acquired from pool',
    );
  });

  newPool.on('release', () => {
    logger.debug('Client released back to pool');
  });

  newPool.on('remove', () => {
    logger.debug('Client removed from pool');
  });

  newPool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle pool client');
  });

  logger.info(
    { min: config.min, max: config.max, idleTimeoutMs: config.idleTimeoutMillis },
    'Database connection pool created',
  );

  return newPool;
}

// ---------------------------------------------------------------------------
// Connection with retry + exponential backoff
// ---------------------------------------------------------------------------

async function connectWithRetry(): Promise<void> {
  const maxAttempts = DEFAULTS.retryAttempts;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await getPool().connect();
      await client.query('SELECT 1');
      client.release();
      logger.info({ attempt }, 'Database connection established');
      return;
    } catch (err) {
      const delay = Math.min(
        DEFAULTS.retryBaseDelayMs * Math.pow(2, attempt - 1),
        DEFAULTS.retryMaxDelayMs,
      );

      if (attempt === maxAttempts) {
        logger.error({ err, attempt }, 'All database connection attempts exhausted');
        throw err;
      }

      logger.warn({ err, attempt, nextRetryMs: delay }, 'Database connection failed, retrying');
      await sleep(delay);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  pool: {
    total: number;
    idle: number;
    waiting: number;
  };
  error?: string;
}

async function checkHealth(): Promise<HealthCheckResult> {
  const p = getPool();
  const start = Date.now();

  try {
    const client = await p.connect();
    try {
      await client.query('SELECT 1');
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        pool: { total: p.totalCount, idle: p.idleCount, waiting: p.waitingCount },
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      pool: { total: p.totalCount, idle: p.idleCount, waiting: p.waitingCount },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Pool monitoring (periodic health check)
// ---------------------------------------------------------------------------

function startHealthCheckMonitor(intervalMs = DEFAULTS.healthCheckIntervalMs): void {
  stopHealthCheckMonitor();

  healthCheckTimer = setInterval(async () => {
    const result = await checkHealth();
    if (!result.healthy) {
      logger.error({ result }, 'Database health check failed');
    } else {
      logger.debug({ latencyMs: result.latencyMs, pool: result.pool }, 'Database health check OK');
    }
  }, intervalMs);

  // Allow the process to exit even if the timer is still running
  if (healthCheckTimer.unref) {
    healthCheckTimer.unref();
  }
}

function stopHealthCheckMonitor(): void {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Query helpers (safe client acquisition & release)
// ---------------------------------------------------------------------------

async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await getPool().query<T>(text, params);
    logger.debug({ durationMs: Date.now() - start, rows: result.rowCount }, 'Query executed');
    return result;
  } catch (err) {
    logger.error({ err, durationMs: Date.now() - start, query: text }, 'Query failed');
    throw err;
  }
}

async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

/**
 * Execute a callback within a database transaction.
 * Automatically commits on success and rolls back on error.
 * The client is always released back to the pool.
 */
async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Pool stats (for metrics / monitoring endpoints)
// ---------------------------------------------------------------------------

function getPoolStats() {
  const p = getPool();
  return {
    totalCount: p.totalCount,
    idleCount: p.idleCount,
    waitingCount: p.waitingCount,
  };
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function closePool(): Promise<void> {
  stopHealthCheckMonitor();
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const db = {
  /** Establish initial connection with retry logic and start health monitor */
  connect: async () => {
    await connectWithRetry();
    startHealthCheckMonitor();
  },
  /** Run a parameterised query (client auto-acquired and released) */
  query,
  /** Acquire a raw PoolClient — caller must call client.release() */
  getClient,
  /** Execute a callback inside a BEGIN/COMMIT transaction */
  withTransaction,
  /** Check database connectivity and pool status */
  checkHealth,
  /** Get current pool statistics */
  getPoolStats,
  /** Gracefully close the pool (call on process shutdown) */
  close: closePool,
};
