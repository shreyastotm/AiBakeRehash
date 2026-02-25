import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Storage health check (S3 / R2 / local)
// ---------------------------------------------------------------------------

export interface StorageHealthResult {
  healthy: boolean;
  provider: string;
  latencyMs: number;
  error?: string;
}

/**
 * Lightweight connectivity check for the configured storage provider.
 * For now this validates that the required env vars are present.
 * A full S3 HeadBucket call can be added once the AWS SDK is wired in.
 */
async function checkHealth(): Promise<StorageHealthResult> {
  const provider = process.env.STORAGE_PROVIDER || 'none';
  const start = Date.now();

  if (provider === 'none' || !process.env.STORAGE_BUCKET) {
    return {
      healthy: true,
      provider: 'none',
      latencyMs: Date.now() - start,
    };
  }

  try {
    // Validate required configuration is present
    const bucket = process.env.STORAGE_BUCKET;
    const region = process.env.STORAGE_REGION;

    if (!bucket || !region) {
      return {
        healthy: false,
        provider,
        latencyMs: Date.now() - start,
        error: 'Missing STORAGE_BUCKET or STORAGE_REGION',
      };
    }

    // Configuration is valid — mark healthy
    // Full S3 HeadBucket check can be added when AWS SDK is integrated
    return {
      healthy: true,
      provider,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    logger.error({ err }, 'Storage health check failed');
    return {
      healthy: false,
      provider,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const storage = {
  checkHealth,
};
