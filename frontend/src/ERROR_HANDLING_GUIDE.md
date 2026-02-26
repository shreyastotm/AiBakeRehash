# Error Handling and Recovery Guide

This guide explains how to use the error handling and recovery components in AiBake.

## Components Overview

### 1. ErrorBoundary Component

Catches React errors and displays a user-friendly error page.

**Location:** `src/components/ErrorBoundary.tsx`

**Features:**
- Catches unhandled React errors
- Displays user-friendly error messages
- Shows error details in development mode
- Provides "Try Again" and "Refresh Page" buttons
- Tracks error count and warns on multiple errors

**Usage:**
The ErrorBoundary is already wrapped around the entire app in `App.tsx`. It automatically catches any React errors in child components.

```tsx
// Already implemented in App.tsx
<ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
</ErrorBoundary>
```

### 2. ErrorMessage Component

Displays user-friendly error messages with optional retry functionality.

**Location:** `src/components/common/ErrorMessage.tsx`

**Features:**
- Multiple variants: error, warning, info
- Optional retry button with loading state
- Dismissible with close button
- Expandable details section
- Accessible design

**Usage Example:**

```tsx
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { useErrorHandler } from '@/hooks/useErrorHandler'

function MyComponent() {
  const { error, handleError, retry, clearError, isRetrying } = useErrorHandler()

  const handleSubmit = async () => {
    try {
      await submitForm()
    } catch (err) {
      handleError(err)
    }
  }

  return (
    <div>
      {error && (
        <ErrorMessage
          title="Failed to submit form"
          message={error.message}
          details={error.details}
          onRetry={() => retry(handleSubmit)}
          onDismiss={clearError}
          isRetrying={isRetrying}
        />
      )}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  )
}
```

### 3. useAutoSave Hook

Auto-saves form data to localStorage at regular intervals.

**Location:** `src/hooks/useAutoSave.ts`

**Features:**
- Saves data every 30 seconds (configurable)
- Only saves when data changes
- Stores timestamp of last save
- Dispatches custom events for cross-tab sync
- Saves on component unmount

**Usage Example:**

```tsx
import { useAutoSave } from '@/hooks/useAutoSave'
import { useState } from 'react'

function RecipeForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ingredients: [],
  })

  // Auto-save form data every 30 seconds
  const { saveNow } = useAutoSave(formData, {
    key: 'recipe-form-draft',
    interval: 30000,
    enabled: true,
  })

  return (
    <form>
      <input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      <button onClick={saveNow}>Save Now</button>
    </form>
  )
}
```

### 4. useRestoreFormData Hook

Restores form data from localStorage on page reload.

**Location:** `src/hooks/useAutoSave.ts`

**Features:**
- Restores saved form data on mount
- Returns restoration status and timestamp
- Provides function to clear restored data
- Handles parsing errors gracefully

**Usage Example:**

```tsx
import { useRestoreFormData } from '@/hooks/useAutoSave'
import { FormRecoveryBanner } from '@/components/FormRecoveryBanner'
import { useState } from 'react'

function RecipeForm() {
  const defaultFormData = {
    title: '',
    description: '',
    ingredients: [],
  }

  const { data, hasRestoredData, timestamp, clearRestored } = useRestoreFormData(
    'recipe-form-draft',
    defaultFormData
  )

  const [formData, setFormData] = useState(data)

  const handleRestore = () => {
    setFormData(data)
  }

  const handleDiscard = () => {
    setFormData(defaultFormData)
    clearRestored()
  }

  return (
    <div>
      {hasRestoredData && (
        <FormRecoveryBanner
          timestamp={timestamp}
          onRestore={handleRestore}
          onDiscard={handleDiscard}
        />
      )}
      <form>
        <input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </form>
    </div>
  )
}
```

### 5. useErrorHandler Hook

Handles API errors with retry logic.

**Location:** `src/hooks/useErrorHandler.ts`

**Features:**
- Parses errors from various sources
- Tracks retry count (max 3 by default)
- Identifies retryable errors (5xx, 429, 408)
- Provides retry function
- Customizable error callback

**Usage Example:**

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler'

function RecipeList() {
  const { error, isRetrying, retry, clearError, isRetryable } = useErrorHandler({
    maxRetries: 3,
    onError: (err) => console.error('API Error:', err),
  })

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      if (!response.ok) throw new Error('Failed to fetch recipes')
      return response.json()
    } catch (err) {
      throw err
    }
  }

  return (
    <div>
      {error && (
        <ErrorMessage
          message={error.message}
          onRetry={isRetryable ? () => retry(fetchRecipes) : undefined}
          onDismiss={clearError}
          isRetrying={isRetrying}
        />
      )}
      <button onClick={() => retry(fetchRecipes)}>Load Recipes</button>
    </div>
  )
}
```

### 6. FormRecoveryBanner Component

Displays a banner when form data has been recovered from localStorage.

**Location:** `src/components/FormRecoveryBanner.tsx`

**Features:**
- Shows recovery timestamp in human-readable format
- Restore and Discard buttons
- Dismissible banner
- Accessible design

**Usage Example:**

```tsx
import { FormRecoveryBanner } from '@/components/FormRecoveryBanner'

function MyForm() {
  const { data, hasRestoredData, timestamp, clearRestored } = useRestoreFormData(
    'my-form',
    defaultData
  )

  return (
    <div>
      {hasRestoredData && (
        <FormRecoveryBanner
          timestamp={timestamp}
          onRestore={() => setFormData(data)}
          onDiscard={() => {
            setFormData(defaultData)
            clearRestored()
          }}
        />
      )}
      {/* Form content */}
    </div>
  )
}
```

## Complete Example: Recipe Form with Error Handling

```tsx
import { useState } from 'react'
import { useAutoSave, useRestoreFormData } from '@/hooks/useAutoSave'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { FormRecoveryBanner } from '@/components/FormRecoveryBanner'
import { recipeService } from '@/services/recipe.service'

interface RecipeFormData {
  title: string
  description: string
  servings: number
  ingredients: Array<{ name: string; quantity: number; unit: string }>
}

const defaultFormData: RecipeFormData = {
  title: '',
  description: '',
  servings: 1,
  ingredients: [],
}

export function RecipeForm() {
  // Restore form data from localStorage
  const { data: restoredData, hasRestoredData, timestamp, clearRestored } = 
    useRestoreFormData('recipe-form-draft', defaultFormData)

  // Initialize form state
  const [formData, setFormData] = useState<RecipeFormData>(restoredData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-save form data every 30 seconds
  useAutoSave(formData, {
    key: 'recipe-form-draft',
    interval: 30000,
    enabled: true,
  })

  // Error handling with retry
  const { error, isRetrying, retry, clearError, isRetryable } = useErrorHandler({
    maxRetries: 3,
  })

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await recipeService.createRecipe(formData)
      // Clear saved data on success
      clearRestored()
      setFormData(defaultFormData)
    } catch (err) {
      // Error is handled by useErrorHandler
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle retry
  const handleRetry = async () => {
    await retry(async () => {
      setIsSubmitting(true)
      try {
        await recipeService.createRecipe(formData)
        clearRestored()
        setFormData(defaultFormData)
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Recovery Banner */}
      {hasRestoredData && (
        <FormRecoveryBanner
          timestamp={timestamp}
          onRestore={() => setFormData(restoredData)}
          onDiscard={() => {
            setFormData(defaultFormData)
            clearRestored()
          }}
        />
      )}

      {/* Error Message */}
      {error && (
        <ErrorMessage
          title="Failed to create recipe"
          message={error.message}
          details={error.details}
          onRetry={isRetryable ? handleRetry : undefined}
          onDismiss={clearError}
          isRetrying={isRetrying}
        />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Recipe Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={4}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isRetrying}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting || isRetrying ? 'Saving...' : 'Save Recipe'}
        </button>
      </form>
    </div>
  )
}
```

## Best Practices

1. **Always use ErrorBoundary** at the app root to catch unexpected errors
2. **Use useAutoSave** for all forms to prevent data loss
3. **Use useRestoreFormData** to recover user data after page reloads
4. **Use useErrorHandler** for API calls with retry logic
5. **Display ErrorMessage** for user-facing errors
6. **Show FormRecoveryBanner** when recovered data is available
7. **Test error scenarios** to ensure graceful degradation
8. **Log errors** for debugging and monitoring in production

## Error Types

### Retryable Errors
- 408 Request Timeout
- 429 Too Many Requests
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

### Non-Retryable Errors
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

## localStorage Keys

Form data is stored with these key patterns:
- `{formKey}` - The form data (JSON)
- `{formKey}__timestamp` - The save timestamp (ISO string)

Example: `recipe-form-draft` and `recipe-form-draft__timestamp`

## Clearing Saved Data

To clear all saved form data:

```tsx
// Clear specific form
localStorage.removeItem('recipe-form-draft')
localStorage.removeItem('recipe-form-draft__timestamp')

// Clear all AiBake form data
Object.keys(localStorage).forEach((key) => {
  if (key.includes('__timestamp')) {
    localStorage.removeItem(key)
    localStorage.removeItem(key.replace('__timestamp', ''))
  }
})
```

## Monitoring and Debugging

In development mode, the ErrorBoundary shows:
- Full error message
- Component stack trace
- Error count

In production, errors are logged for monitoring services (Sentry, etc.).

To enable error logging:

```tsx
// In ErrorBoundary.tsx, uncomment the production error logging
if (process.env.NODE_ENV === 'production') {
  // Send to error tracking service
  Sentry.captureException(error, { contexts: { react: errorInfo } })
}
```
