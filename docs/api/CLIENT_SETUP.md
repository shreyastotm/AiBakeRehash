# API Client Setup and Configuration

## Overview

The AiBake frontend implements a robust API client with automatic retry logic, error handling, and JWT authentication. This document describes the architecture and configuration of the API client layer.

## Architecture

### Core Components

1. **Axios Instance** (`frontend/src/services/api.ts`)
   - Base HTTP client with interceptors
   - Automatic retry logic with exponential backoff
   - JWT token injection
   - Error handling and 401 redirect

2. **React Query** (`frontend/src/services/queryClient.ts`)
   - Data fetching and caching
   - Automatic refetch on focus/reconnect
   - Query invalidation
   - Mutation handling

3. **Custom Hooks** (`frontend/src/hooks/useApi.ts`)
   - `useApiQuery()` - GET requests
   - `useApiPost()` - POST requests
   - `useApiPatch()` - PATCH requests
   - `useApiDelete()` - DELETE requests

4. **Service Modules** (`frontend/src/services/*.service.ts`)
   - Domain-specific API calls
   - Type-safe request/response handling
   - Business logic encapsulation

## Retry Logic

### Configuration

The API client uses exponential backoff for automatic retries:

```typescript
interface RetryConfig {
  maxRetries: number           // Maximum retry attempts (default: 3)
  initialDelayMs: number       // Initial delay in milliseconds (default: 1000)
  maxDelayMs: number           // Maximum delay cap (default: 10000)
  backoffMultiplier: number    // Exponential multiplier (default: 2)
}

// Default configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}
```

### Retryable Errors

The client automatically retries on:
- **Network errors** - No response from server
- **408 Request Timeout** - Server timeout
- **429 Too Many Requests** - Rate limiting
- **5xx Server Errors** - 500-599 status codes

### Non-Retryable Errors

The client does NOT retry on:
- **4xx Client Errors** - 400-499 (except 408, 429)
- **401 Unauthorized** - Immediately redirects to login

### Backoff Strategy

Delay calculation: `delay = initialDelayMs * (backoffMultiplier ^ (attempt - 1))`

**Example sequence:**
```
Attempt 1: Wait 1 second (1000 * 2^0)
Attempt 2: Wait 2 seconds (1000 * 2^1)
Attempt 3: Wait 4 seconds (1000 * 2^2)
Maximum:   Capped at 10 seconds
```

### Implementation Details

```typescript
// Calculate exponential backoff delay
const getBackoffDelay = (
  attempt: number,
  config: RetryConfig
): number => {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1)
  return Math.min(delay, config.maxDelayMs)
}

// Check if error is retryable
const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) {
    // Network error
    return true
  }

  const status = error.response.status
  // Retry on 408, 429, 5xx errors
  return status === 408 || status === 429 || (status >= 500 && status < 600)
}
```

## Request Flow

### Successful Request

```
1. Component calls API method
   ↓
2. Axios request interceptor adds auth token
   ↓
3. Request sent to backend
   ↓
4. Response received
   ↓
5. Response interceptor processes response
   ↓
6. Data returned to component
```

### Failed Request with Retry

```
1. Request fails with retryable error (e.g., 503)
   ↓
2. Response interceptor checks if retryable
   ↓
3. Calculate backoff delay
   ↓
4. Wait for delay
   ↓
5. Retry request (increment retry count)
   ↓
6. If successful: return response
   If failed: repeat from step 2 (up to maxRetries)
   ↓
7. If all retries exhausted: return error
```

### Authentication Error

```
1. Request fails with 401 Unauthorized
   ↓
2. Response interceptor detects 401
   ↓
3. Remove auth token from localStorage
   ↓
4. Redirect to /login
   ↓
5. Return error to caller
```

## Usage Examples

### Basic Query

```typescript
import { useApiQuery } from '@/hooks/useApi'

function RecipeList() {
  const { data, isLoading, error } = useApiQuery<Recipe[]>(
    'recipes',
    '/recipes'
  )

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {data?.map((recipe) => (
        <li key={recipe.id}>{recipe.title}</li>
      ))}
    </ul>
  )
}
```

### Mutation with Error Handling

```typescript
import { useApiPost } from '@/hooks/useApi'
import { queryClient } from '@/services/queryClient'

function CreateRecipe() {
  const { mutate, isPending, error } = useApiPost<Recipe, RecipeCreateRequest>(
    '/recipes',
    {
      onSuccess: (newRecipe) => {
        queryClient.invalidateQueries({ queryKey: ['recipes'] })
        console.log('Recipe created:', newRecipe)
      },
      onError: (error) => {
        console.error('Failed to create recipe:', error)
      },
    }
  )

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      mutate({ /* form data */ })
    }}>
      {error && <div className="error">{error.message}</div>}
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Recipe'}
      </button>
    </form>
  )
}
```

### Dependent Queries

```typescript
import { useApiQuery } from '@/hooks/useApi'

function RecipeWithIngredients({ recipeId }: { recipeId: string }) {
  const { data: recipe } = useApiQuery<Recipe>(
    ['recipe', recipeId],
    `/recipes/${recipeId}`
  )

  // Only fetch ingredients if recipe is loaded
  const { data: ingredients } = useApiQuery<RecipeIngredient[]>(
    ['recipe-ingredients', recipeId],
    `/recipes/${recipeId}/ingredients`,
    {
      enabled: !!recipe, // Only run when recipe exists
    }
  )

  return (
    <div>
      <h1>{recipe?.title}</h1>
      <ul>
        {ingredients?.map((ing) => (
          <li key={ing.id}>{ing.display_name}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Optimistic Updates

```typescript
import { useApiPatch } from '@/hooks/useApi'
import { queryClient } from '@/services/queryClient'

function UpdateRecipe({ recipe }: { recipe: Recipe }) {
  const { mutate } = useApiPatch<Recipe, Partial<Recipe>>(
    `/recipes/${recipe.id}`,
    {
      onMutate: async (updatedData) => {
        // Cancel ongoing queries
        await queryClient.cancelQueries({ queryKey: ['recipe', recipe.id] })

        // Snapshot previous data
        const previousRecipe = queryClient.getQueryData(['recipe', recipe.id])

        // Optimistically update cache
        queryClient.setQueryData(['recipe', recipe.id], {
          ...recipe,
          ...updatedData,
        })

        return { previousRecipe }
      },
      onError: (error, variables, context) => {
        // Revert on error
        if (context?.previousRecipe) {
          queryClient.setQueryData(['recipe', recipe.id], context.previousRecipe)
        }
      },
      onSuccess: () => {
        // Refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['recipe', recipe.id] })
      },
    }
  )

  return (
    <button onClick={() => mutate({ title: 'Updated Title' })}>
      Update Recipe
    </button>
  )
}
```

## Error Handling

### Global Error Handling

Errors are handled at multiple levels:

1. **Axios Interceptor** - Handles 401 and retryable errors
2. **React Query** - Retries queries and mutations
3. **Component Level** - Displays error messages to users

### Component-Level Error Handling

```typescript
import { useApiQuery } from '@/hooks/useApi'
import { AxiosError } from 'axios'

function RecipeList() {
  const { data, error, isError } = useApiQuery<Recipe[]>(
    'recipes',
    '/recipes'
  )

  if (isError) {
    const axiosError = error as AxiosError
    return (
      <div className="error">
        <h2>Error loading recipes</h2>
        <p>{axiosError.message}</p>
        {axiosError.response?.status === 404 && (
          <p>Recipes not found</p>
        )}
      </div>
    )
  }

  return <div>{/* render data */}</div>
}
```

## Cache Management

### Invalidate Cache

```typescript
import { queryClient } from '@/services/queryClient'

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['recipes'] })

// Invalidate all queries with prefix
queryClient.invalidateQueries({ queryKey: ['recipe'] })

// Invalidate all queries
queryClient.invalidateQueries()
```

### Prefetch Data

```typescript
import { queryClient } from '@/services/queryClient'
import api from '@/services/api'

// Prefetch recipe details
queryClient.prefetchQuery({
  queryKey: ['recipe', recipeId],
  queryFn: async () => {
    const response = await api.get(`/recipes/${recipeId}`)
    return response.data
  },
})
```

### Clear Cache

```typescript
import { queryClient } from '@/services/queryClient'

// Clear specific query
queryClient.removeQueries({ queryKey: ['recipes'] })

// Clear all queries
queryClient.clear()
```

## Configuration

### Environment Variables

Set the API base URL in `.env`:

```
VITE_API_URL=http://localhost:3000/api/v1
```

Default: `http://localhost:3000/api/v1`

### Modifying Retry Behavior

To customize retry behavior, edit `DEFAULT_RETRY_CONFIG` in `frontend/src/services/api.ts`:

```typescript
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,              // Increase max retries
  initialDelayMs: 500,        // Decrease initial delay
  maxDelayMs: 30000,          // Increase max delay
  backoffMultiplier: 1.5,     // Adjust backoff multiplier
}
```

## Best Practices

1. **Use query keys consistently** - Always use the same key structure for related queries
2. **Invalidate on mutations** - Invalidate affected queries after mutations
3. **Enable dependent queries** - Use `enabled` option for queries that depend on other data
4. **Handle loading states** - Show loading indicators while fetching
5. **Handle errors gracefully** - Display user-friendly error messages
6. **Use optimistic updates** - Update UI immediately for better UX
7. **Prefetch data** - Prefetch data on hover or route change for faster navigation
8. **Monitor cache** - Use React Query DevTools to monitor cache state
9. **Avoid unnecessary retries** - Don't retry on client errors (4xx)
10. **Log retry attempts** - Monitor retry behavior in production

## Monitoring and Debugging

### React Query DevTools

Enable in development to monitor cache state:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

Install devtools:
```bash
npm install @tanstack/react-query-devtools
```

### Logging Retry Attempts

Add logging to track retry behavior:

```typescript
// In api.ts response interceptor
if (isRetryableError(error) && config.retryCount < DEFAULT_RETRY_CONFIG.maxRetries) {
  config.retryCount++
  const delay = getBackoffDelay(config.retryCount, DEFAULT_RETRY_CONFIG)
  
  console.log(`Retrying request (attempt ${config.retryCount}/${DEFAULT_RETRY_CONFIG.maxRetries}) after ${delay}ms`)
  
  await new Promise((resolve) => setTimeout(resolve, delay))
  return api(config)
}
```

## Related Documentation

- [API Client Guide](./API_CLIENT_GUIDE.md) - Usage examples and patterns
- [OpenAPI Specification](./openapi.yaml) - Backend API endpoints
- [Frontend README](../../frontend/README.md) - Frontend setup and development
