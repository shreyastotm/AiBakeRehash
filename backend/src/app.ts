import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { db } from './config/database';
import { redis } from './config/redis';
import { storage } from './config/storage';
import { logger } from './utils/logger';
import { metricsMiddleware, renderMetrics } from './utils/metrics';
import { requestIdMiddleware } from './middleware/requestId';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// ---------------------------------------------------------------------------
// 1. Request ID — must be first so all downstream logs carry it
// ---------------------------------------------------------------------------
app.use(requestIdMiddleware);

// ---------------------------------------------------------------------------
// 2. Security headers (helmet)
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// ---------------------------------------------------------------------------
// 3. CORS with whitelist
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, curl, health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 600, // Cache preflight for 10 minutes
  }),
);

// ---------------------------------------------------------------------------
// 4. Body parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// 5. Metrics collection (before rate limiter so we capture everything)
// ---------------------------------------------------------------------------
app.use(metricsMiddleware);

// ---------------------------------------------------------------------------
// 6. Global rate limiting (per IP)
// ---------------------------------------------------------------------------
app.use(apiRateLimiter);

// ---------------------------------------------------------------------------
// 7. Request / response logging
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const requestId = req.requestId;
  const start = Date.now();

  logger.info(
    {
      method: req.method,
      url: req.url,
      requestId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    'incoming request',
  );

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](
      {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs: duration,
        requestId,
        contentLength: res.get('content-length'),
      },
      'request completed',
    );
  });

  next();
});

// ---------------------------------------------------------------------------
// 8. Health / readiness / metrics endpoints (no auth required)
// ---------------------------------------------------------------------------

app.get('/health', async (_req, res) => {
  const [dbHealth, redisHealth, storageHealth] = await Promise.all([
    db.checkHealth(),
    redis.checkHealth(),
    storage.checkHealth(),
  ]);

  const allHealthy = dbHealth.healthy && redisHealth.healthy && storageHealth.healthy;
  const status = allHealthy ? 'ok' : 'degraded';

  res.status(allHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth,
      redis: redisHealth,
      storage: storageHealth,
    },
  });
});

app.get('/ready', async (_req, res) => {
  const [dbHealth, redisHealth] = await Promise.all([
    db.checkHealth(),
    redis.checkHealth(),
  ]);

  // Readiness requires database; Redis degradation is tolerable
  if (dbHealth.healthy) {
    res.status(200).json({
      ready: true,
      services: {
        database: dbHealth.healthy,
        redis: redisHealth.healthy,
      },
    });
  } else {
    res.status(503).json({
      ready: false,
      reason: 'database unavailable',
      services: {
        database: dbHealth.healthy,
        redis: redisHealth.healthy,
      },
    });
  }
});

app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(renderMetrics());
});

// ---------------------------------------------------------------------------
// 9. API routes
// ---------------------------------------------------------------------------
import authRoutes from './routes/auth.routes';
import recipeRoutes from './routes/recipe.routes';
import ingredientRoutes from './routes/ingredient.routes';
import journalRoutes from './routes/journal.routes';
import inventoryRoutes from './routes/inventory.routes';
import costingRoutes from './routes/costing.routes';
import supplierRoutes from './routes/supplier.routes';
import socialRoutes from './routes/social.routes';

app.use('/api/v1', authRoutes);
app.use('/api/v1', recipeRoutes);
app.use('/api/v1', ingredientRoutes);
app.use('/api/v1', journalRoutes);
app.use('/api/v1', inventoryRoutes);
app.use('/api/v1', costingRoutes);
app.use('/api/v1', supplierRoutes);
app.use('/api/v1', socialRoutes);

// ---------------------------------------------------------------------------
// 10. Catch-all 404 (must come after all route registrations)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);

// ---------------------------------------------------------------------------
// 11. Global error handler (must be last middleware)
// ---------------------------------------------------------------------------
app.use(errorHandler);

export { app };
