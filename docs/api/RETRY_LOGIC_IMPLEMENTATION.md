# API Client Retry Logic Implementation

## Overview

The AiBake frontend API client now includes robust automatic retry logic with exponential backoff. This ensures reliable communication with the backend even in unstable network conditions.

## Changes Made

### File: `frontend/src/services/api.ts`

#### New Exports

```typescript
export { DEFAULT_RETRY_CONFIG, type RetryConfig }
```

#### New Types

```typescript
interface RetryConfig {
  maxRetries: number           // Maximum retry attempts
  initialDelayMs: number       // Initial delay in milliseconds
  maxDelayMs: number           // Maximum delay cap
  backoffMultiplier: number    // Exponential multiplier
}
```

#### New Functions

**`getBackoffDelay(attempt, config)`**
- Calculates exponential backoff delay
- Formula: `initialDelayMs * (backoffMultiplier ^ (attempt - 1))`
- Capped at `maxDelayMs`

**`isRetryableError(error)`**
- Determines if an error should trigger a retry
- Returns `true` for:
  - Network errors (no response)
  - 408 Request Timeout
  - 429 Too Many Requests
  - 5xx Server Errors (500-599)
- Returns `false` for:
  - 4xx Client Errors (except 408, 429)
  - 401 Unauthorized

#### Enhanced Response Interceptor

The response interceptor now:
1. Tracks retry count on request config
2. Checks if error is retryable
3. Calculates backoff delay
4. Waits before retrying
5. Retries the request up to `maxRetries` times
6. Returns error if all retries exhausted

### Default Configuration

```typescript
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}
```

**Retry Sequence:**
- Attempt 1: Wait 1 second
- Attempt 2: Wait 2 seconds
- Attempt 3: Wait 4 seconds
- Maximum delay: 10 seconds

## Benefits

### Improved Reliability
- Automatically recovers from transient network failures
- Reduces user-facing errors in unstable conditions
- Handles temporary server issues gracefully

### Better User Experience
- Transparent retry mechanism (no user action needed)
- Exponential backoff prevents overwhelming the server
- Automatic 401 redirect for authentication failures

### Production Ready
- Configurable retry behavior
- Respects rate limiting (429 status)
- Handles timeout scenarios (408 status)
- Prevents cascading failures with backoff

## Usage

### Basic Usage (Automatic)

No changes needed! Retry logic is automatic:

```typescript
import api from '@/services/api'

// This will automatically retry on retryable errors
const response = await api.get('/recipes')
```

### Accessing Configuration

```typescript
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from '@/services/api'

console.log(DEFAULT_RETRY_CONFIG)
// { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 }
```

### Customizing Retry Behavior

Edit `DEFAULT_RETRY_CONFIG` in `frontend/src/services/api.ts`:

```typescript
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,              // More retries
  initialDelayMs: 500,        // Faster initial retry
  maxDelayMs: 30000,          // Longer max delay
  backoffMultiplier: 1.5,     // Slower backoff growth
}
```

## Error Handling

### Retryable Errors (Automatically Retried)

| Status | Description | Retries |
|--------|-------------|---------|
| Network Error | No response from server | Yes |
| 408 | Request Timeout | Yes |
| 429 | Too Many Requests | Yes |
| 5xx | Server Errors | Yes |

### Non-Retryable Errors (Immediate Failure)

| Status | Description | Action |
|--------|-------------|--------|
| 4xx | Client Errors | Fail immediately |
| 401 | Unauthorized | Redirect to login |

## Monitoring

### Logging Retry Attempts

Add logging to track retry behavior in production:

```typescript
// In api.ts response interceptor
if (isRetryableError(error) && config.retryCount < DEFAULT_RETRY_CONFIG.maxRetries) {
  config.retryCount++
  const delay = getBackoffDelay(config.retryCount, DEFAULT_RETRY_CONFIG)
  
  console.log(`Retrying ${config.url} (attempt ${config.retryCount}/${DEFAULT_RETRY_CONFIG.maxRetries}) after ${delay}ms`)
  
  await new Promise((resolve) => setTimeout(resolve, delay))
  return api(config)
}
```

### React Query DevTools

Monitor cache and request state:

```bash
npm install @tanstack/react-query-devtools
```

## Testing

### Test Retry Logic

```typescript
import { describe, it, expect, vi } from 'vitest'
import api from '@/services/api'

describe('API Retry Logic', () => {
  it('should retry on 503 error', async () => {
    const mockAxios = vi.spyOn(api, 'get')
    mockAxios.mockRejectedValueOnce({ response: { status: 503 } })
    mockAxios.mockResolvedValueOnce({ data: { success: true } })

    const result = await api.get('/recipes')
    expect(result.data.success).toBe(true)
    expect(mockAxios).toHaveBeenCalledTimes(2) // Initial + 1 retry
  })

  it('should not retry on 400 error', async () => {
    const mockAxios = vi.spyOn(api, 'get')
    mockAxios.mockRejectedValueOnce({ response: { status: 400 } })

    await expect(api.get('/recipes')).rejects.toThrow()
    expect(mockAxios).toHaveBeenCalledTimes(1) // No retries
  })
})
```

## Performance Impact

### Network Overhead
- Minimal: Only retries on actual failures
- Backoff prevents overwhelming the server
- Reduces total request volume in unstable conditions

### Latency
- Adds delay only on failures
- Exponential backoff prevents rapid retries
- Maximum additional latency: ~7 seconds (1+2+4)

## Migration Guide

### For Existing Code

No changes required! The retry logic is transparent:

```typescript
// Existing code works as-is
const { data } = useApiQuery('recipes', '/recipes')
```

### For New Code

Use the exported types and configuration:

```typescript
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from '@/services/api'

// Access retry configuration
const maxRetries = DEFAULT_RETRY_CONFIG.maxRetries
```

## Troubleshooting

### Requests Still Failing After Retries

1. Check if error is retryable (see table above)
2. Verify backend is responding (not permanently down)
3. Check network connectivity
4. Review error logs for details

### Retries Taking Too Long

1. Reduce `maxRetries` in `DEFAULT_RETRY_CONFIG`
2. Reduce `initialDelayMs` for faster retries
3. Reduce `maxDelayMs` to cap maximum wait time

### Too Many Retries

1. Reduce `maxRetries` in `DEFAULT_RETRY_CONFIG`
2. Increase `backoffMultiplier` for longer delays
3. Check if backend is rate limiting (429 status)

## Related Documentation

- [API Client Setup](./CLIENT_SETUP.md) - Complete API client documentation
- [API Client Guide](./API_CLIENT_GUIDE.md) - Usage examples and patterns
- [Frontend README](../../frontend/README.md) - Frontend setup and development
