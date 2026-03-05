import dotenv from 'dotenv';

dotenv.config();

import { app } from './app';
import { db } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  try {
    await db.connect();
    logger.info('Database connected successfully');

    try {
      await redis.getClient();
      logger.info('Redis connected successfully');
    } catch (err) {
      logger.warn({ err }, 'Redis unavailable — running without cache');
    }

    app.listen(PORT, () => {
      logger.info(`AiBake API server running on port ${PORT}`);
      // Forced reload marker
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    logger.info({ signal }, 'Shutdown signal received');
    await redis.close();
    await db.close();
    process.exit(0);
  });
}

start();
