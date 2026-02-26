# API Client Setup Guide

## Overview

The AiBake frontend uses a comprehensive API client setup with:
- **Axios** for HTTP requests
- **React Query** for data fetching, caching, and synchronization
- **Automatic retry logic** with exponential backoff
- **JWT authentication** with token management
- **Error handling** with automatic 401 redirect

## Files

### `api.ts`
Core Axios instance with interceptors for:
- Authentication token injection
- Automatic retry logic with exponential backoff
- Error handling and 401 redirect

**Features:**
- Retries on network errors, 408, 429, and 5xx status codes
- Exponential backoff: 1s, 2s, 4s (max 10s)
- Maximum 3 retry attempts
- Automatic 401 redirect to login
- Configurable retry behavior via `RetryConfig`

**Retry Configuration:**
```typescript
interface RetryConfig {
  maxRetries: number           // Default: 3
  initialDelayMs: number       // Default: 1000ms
  maxDelayMs: number           // Default: 10000ms
  backoffMultiplier: number    // Default: 2
}
```

**Retryable Status Codes:**
- Network errors (no response)
- 408 Request Timeout
- 429 Too Many Requests
- 5xx Server Errors (500-599)

**Non-Retryable Status Codes:**
- 4xx Client Errors (except 408, 429)
- 401 Unauthorized (redirects to login immediately)

### `queryClient.ts`
React Query client configuration with:
- 5-minute cache duration (staleTime)
- 10-minute garbage collection (gcTime)
- Automatic refetch on window focus
- Automatic refetch on reconnect
- Retry configuration for queries and mutations

### `useApi.ts`
Custom React Query hooks:
- `useApiQuery()` - GET requests
- `useApiPost()` - POST requests
- `useApiPatch()` - PATCH requests
- `useApiDelete()` - DELETE requests
- `useApiMutation()` - Custom mutations

## Usage Examples

### Basic Query (GET)

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

### Mutation (POST)

```typescript
import { useApiPost } from '@/hooks/useApi'
import { queryClient } from '@/services/queryClient'

function CreateRecipe() {
  const { mutate, isPending } = useApiPost<Recipe, RecipeCreateRequest>(
    '/recipes',
    {
      onSuccess: (newRecipe) => {
        // Invalidate recipes list to refetch
        queryClient.invalidateQueries({ queryKey: ['recipes'] })
        console.log('Recipe created:', newRecipe)
      },
      onError: (error) => {
        console.error('Failed to create recipe:', error)
      },
    }
  )

  const handleSubmit = (formData: RecipeCreateRequest) => {
    mutate(formData)
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleSubmit({ /* form data */ })
    }}>
      {/* form fields */}
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Recipe'}
      </button>
    </form>
  )
}
```

### Query with Parameters

```typescript
import { useApiQuery } from '@/hooks/useApi'

function RecipeDetail({ recipeId }: { recipeId: string }) {
  const { data, isLoading, error } = useApiQuery<Recipe>(
    ['recipe', recipeId],
    `/recipes/${recipeId}`
  )

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{data?.title}</div>
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

### Pagination

```typescript
import { useState } from 'react'
import { useApiQuery } from '@/hooks/useApi'

function RecipeListPaginated() {
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading } = useApiQuery<{
    items: Recipe[]
    total: number
  }>(
    ['recipes', page],
    `/recipes?page=${page}&limit=${pageSize}`
  )

  return (
    <div>
      {data?.items.map((recipe) => (
        <div key={recipe.id}>{recipe.title}</div>
      ))}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <button onClick={() => setPage(p => p + 1)} disabled={!data || data.items.length < pageSize}>
        Next
      </button>
    </div>
  )
}
```

## Retry Logic

The API client automatically retries failed requests with exponential backoff:

**Retryable Errors:**
- Network errors (no response)
- 408 Request Timeout
- 429 Too Many Requests
- 5xx Server Errors

**Non-Retryable Errors:**
- 4xx Client Errors (except 408, 429)
- 401 Unauthorized (redirects to login)

**Backoff Strategy:**
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Maximum: 10 seconds

**How It Works:**

1. Request fails with a retryable error
2. Client calculates backoff delay: `initialDelayMs * (backoffMultiplier ^ (attempt - 1))`
3. Delay is capped at `maxDelayMs` (10 seconds)
4. After delay, request is automatically retried
5. Process repeats up to `maxRetries` times (3 by default)
6. If all retries fail, error is returned to the caller

**Example Retry Sequence:**
```
Request fails with 503 Service Unavailable
↓
Wait 1 second, retry (attempt 1)
↓
Still fails with 503
↓
Wait 2 seconds, retry (attempt 2)
↓
Still fails with 503
↓
Wait 4 seconds, retry (attempt 3)
↓
Still fails with 503
↓
Return error to caller
```

**Customizing Retry Behavior:**

Import and use the retry configuration:
```typescript
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from '@/services/api'

// Access default configuration
console.log(DEFAULT_RETRY_CONFIG)
// { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 }
```

To modify retry behavior globally, update `DEFAULT_RETRY_CONFIG` in `api.ts`.

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

## Error Handling

### Global Error Handling

Errors are automatically handled by:
1. Axios interceptor (401 redirect)
2. React Query retry logic
3. Component-level error boundaries

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

## Environment Configuration

Set the API base URL in `.env`:

```
VITE_API_URL=http://localhost:3000/api/v1
```

Default: `http://localhost:3000/api/v1`

## Best Practices

1. **Use query keys consistently** - Always use the same key structure for related queries
2. **Invalidate on mutations** - Invalidate affected queries after mutations
3. **Enable dependent queries** - Use `enabled` option for queries that depend on other data
4. **Handle loading states** - Show loading indicators while fetching
5. **Handle errors gracefully** - Display user-friendly error messages
6. **Use optimistic updates** - Update UI immediately for better UX
7. **Prefetch data** - Prefetch data on hover or route change for faster navigation
8. **Monitor cache** - Use React Query DevTools to monitor cache state

## React Query DevTools

To enable React Query DevTools in development:

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
