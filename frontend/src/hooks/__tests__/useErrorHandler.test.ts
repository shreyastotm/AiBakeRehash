import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useErrorHandler } from '../useErrorHandler'

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler())

    expect(result.current.error).toBeNull()
    expect(result.current.isRetrying).toBe(false)
    expect(result.current.retryCount).toBe(0)
  })

  it('handles Error objects', () => {
    const { result } = renderHook(() => useErrorHandler())
    const error = new Error('Test error')

    act(() => {
      result.current.handleError(error)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.error?.message).toBe('Test error')
  })

  it('handles API error responses', () => {
    const { result } = renderHook(() => useErrorHandler())
    const apiError = {
      response: {
        status: 400,
        data: {
          message: 'Bad request',
          code: 'INVALID_INPUT',
          details: 'Missing required field',
        },
      },
    }

    act(() => {
      result.current.handleError(apiError)
    })

    expect(result.current.error?.message).toBe('Bad request')
    expect(result.current.error?.code).toBe('INVALID_INPUT')
    expect(result.current.error?.status).toBe(400)
  })

  it('handles string errors', () => {
    const { result } = renderHook(() => useErrorHandler())

    act(() => {
      result.current.handleError('Something went wrong')
    })

    expect(result.current.error?.message).toBe('Something went wrong')
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useErrorHandler({ onError }))

    act(() => {
      result.current.handleError(new Error('Test'))
    })

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Test',
    }))
  })

  it('retries operation and clears error on success', async () => {
    const { result } = renderHook(() => useErrorHandler())
    const operation = vi.fn().mockResolvedValue('success')

    act(() => {
      result.current.handleError(new Error('Initial error'))
    })

    expect(result.current.error).toBeTruthy()

    await act(async () => {
      await result.current.retry(operation)
    })

    expect(operation).toHaveBeenCalled()
    expect(result.current.error).toBeNull()
    expect(result.current.retryCount).toBe(0)
  })

  it('increments retry count on failed retry', async () => {
    const { result } = renderHook(() => useErrorHandler({ maxRetries: 3 }))
    const operation = vi.fn().mockRejectedValue(new Error('Retry failed'))

    await act(async () => {
      await result.current.retry(operation)
    })

    expect(result.current.retryCount).toBe(1)
    expect(result.current.error?.message).toBe('Retry failed')
  })

  it('stops retrying after max retries', async () => {
    const { result } = renderHook(() => useErrorHandler({ maxRetries: 2 }))
    const operation = vi.fn().mockRejectedValue(new Error('Failed'))

    // First retry
    await act(async () => {
      await result.current.retry(operation)
    })
    expect(result.current.retryCount).toBe(1)

    // Second retry
    await act(async () => {
      await result.current.retry(operation)
    })
    expect(result.current.retryCount).toBe(2)

    // Third attempt should fail
    await act(async () => {
      await result.current.retry(operation)
    })

    expect(result.current.error?.message).toBe('Maximum retry attempts reached')
  })

  it('identifies retryable errors', () => {
    const { result } = renderHook(() => useErrorHandler())

    // Retryable error (500)
    act(() => {
      result.current.handleError({
        response: { status: 500, data: { message: 'Server error' } },
      })
    })

    expect(result.current.isRetryable).toBe(true)

    // Non-retryable error (400)
    act(() => {
      result.current.handleError({
        response: { status: 400, data: { message: 'Bad request' } },
      })
    })

    expect(result.current.isRetryable).toBe(false)
  })

  it('identifies retryable status codes', () => {
    const { result } = renderHook(() => useErrorHandler())
    const retryableStatuses = [408, 429, 500, 502, 503, 504]

    retryableStatuses.forEach((status) => {
      act(() => {
        result.current.handleError({
          response: { status, data: { message: 'Error' } },
        })
      })

      expect(result.current.isRetryable).toBe(true)
    })
  })

  it('clears error', () => {
    const { result } = renderHook(() => useErrorHandler())

    act(() => {
      result.current.handleError(new Error('Test'))
    })

    expect(result.current.error).toBeTruthy()

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.retryCount).toBe(0)
  })

  it('sets isRetrying flag during retry', async () => {
    const { result } = renderHook(() => useErrorHandler())
    const operation = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    const retryPromise = act(async () => {
      await result.current.retry(operation)
    })

    // Check isRetrying is true during operation
    expect(result.current.isRetrying).toBe(true)

    await retryPromise

    // Check isRetrying is false after operation
    expect(result.current.isRetrying).toBe(false)
  })
})
