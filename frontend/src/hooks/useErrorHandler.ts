import { useState, useCallback } from 'react'

export interface ApiError {
  message: string
  code?: string
  details?: string
  status?: number
}

interface UseErrorHandlerOptions {
  onError?: (error: ApiError) => void
  maxRetries?: number
}

/**
 * Hook for handling API errors with retry logic
 * Requirement 94.1: Create user-friendly error messages
 * Requirement 94.5: Implement manual retry buttons for failed operations
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { onError, maxRetries = 3 } = options
  const [error, setError] = useState<ApiError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Parse error from various sources
  const parseError = useCallback((err: any): ApiError => {
    if (err instanceof Error) {
      return {
        message: err.message,
        details: err.stack,
      }
    }

    if (err?.response?.data) {
      return {
        message: err.response.data.message || 'An error occurred',
        code: err.response.data.code,
        details: err.response.data.details,
        status: err.response.status,
      }
    }

    if (typeof err === 'string') {
      return { message: err }
    }

    return {
      message: 'An unexpected error occurred',
      details: JSON.stringify(err),
    }
  }, [])

  // Handle error
  const handleError = useCallback(
    (err: any) => {
      const parsedError = parseError(err)
      setError(parsedError)
      setRetryCount(0)
      onError?.(parsedError)
    },
    [parseError, onError]
  )

  // Retry operation
  const retry = useCallback(
    async (operation: () => Promise<any>) => {
      if (retryCount >= maxRetries) {
        setError({
          message: 'Maximum retry attempts reached',
          details: `Failed after ${maxRetries} attempts`,
        })
        return
      }

      setIsRetrying(true)
      try {
        await operation()
        setError(null)
        setRetryCount(0)
      } catch (err) {
        setRetryCount((prev) => prev + 1)
        handleError(err)
      } finally {
        setIsRetrying(false)
      }
    },
    [retryCount, maxRetries, handleError]
  )

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
    setRetryCount(0)
  }, [])

  // Check if error is retryable
  const isRetryable = useCallback(() => {
    if (!error) return false
    if (retryCount >= maxRetries) return false

    // Retryable status codes: 408, 429, 500, 502, 503, 504
    const retryableStatuses = [408, 429, 500, 502, 503, 504]
    return !error.status || retryableStatuses.includes(error.status)
  }, [error, retryCount, maxRetries])

  return {
    error,
    isRetrying,
    retryCount,
    handleError,
    retry,
    clearError,
    isRetryable: isRetryable(),
  }
}
