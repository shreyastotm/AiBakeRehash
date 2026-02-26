import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAutoSave, useRestoreFormData } from '../useAutoSave'

describe('useAutoSave', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('saves data to localStorage after interval', async () => {
    const testData = { name: 'Test Recipe', servings: 4 }

    renderHook(() =>
      useAutoSave(testData, {
        key: 'test-form',
        interval: 1000,
        enabled: true,
      })
    )

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      const saved = localStorage.getItem('test-form')
      expect(saved).toBe(JSON.stringify(testData))
    })
  })

  it('stores timestamp when saving', async () => {
    const testData = { name: 'Test' }

    renderHook(() =>
      useAutoSave(testData, {
        key: 'test-form',
        interval: 1000,
        enabled: true,
      })
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      const timestamp = localStorage.getItem('test-form__timestamp')
      expect(timestamp).toBeTruthy()
      expect(new Date(timestamp!).getTime()).toBeGreaterThan(0)
    })
  })

  it('only saves when data changes', async () => {
    const testData = { name: 'Test' }

    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave(data, {
          key: 'test-form',
          interval: 1000,
          enabled: true,
        }),
      { initialProps: { data: testData } }
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const firstSave = localStorage.getItem('test-form')

    // Rerender with same data
    rerender({ data: testData })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const secondSave = localStorage.getItem('test-form')
    expect(firstSave).toBe(secondSave)
  })

  it('respects enabled flag', async () => {
    const testData = { name: 'Test' }

    renderHook(() =>
      useAutoSave(testData, {
        key: 'test-form',
        interval: 1000,
        enabled: false,
      })
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const saved = localStorage.getItem('test-form')
    expect(saved).toBeNull()
  })

  it('provides saveNow function for immediate save', async () => {
    const testData = { name: 'Test' }

    const { result } = renderHook(() =>
      useAutoSave(testData, {
        key: 'test-form',
        interval: 30000,
        enabled: true,
      })
    )

    act(() => {
      result.current.saveNow()
    })

    await waitFor(() => {
      const saved = localStorage.getItem('test-form')
      expect(saved).toBe(JSON.stringify(testData))
    })
  })

  it('saves on unmount', async () => {
    const testData = { name: 'Test' }

    const { unmount } = renderHook(() =>
      useAutoSave(testData, {
        key: 'test-form',
        interval: 30000,
        enabled: true,
      })
    )

    unmount()

    await waitFor(() => {
      const saved = localStorage.getItem('test-form')
      expect(saved).toBe(JSON.stringify(testData))
    })
  })
})

describe('useRestoreFormData', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('restores data from localStorage', () => {
    const testData = { name: 'Test Recipe', servings: 4 }
    localStorage.setItem('test-form', JSON.stringify(testData))
    localStorage.setItem('test-form__timestamp', new Date().toISOString())

    const { result } = renderHook(() =>
      useRestoreFormData('test-form', { name: '', servings: 1 })
    )

    expect(result.current.data).toEqual(testData)
    expect(result.current.hasRestoredData).toBe(true)
    expect(result.current.timestamp).toBeTruthy()
  })

  it('returns default value when no saved data', () => {
    const defaultData = { name: '', servings: 1 }

    const { result } = renderHook(() =>
      useRestoreFormData('test-form', defaultData)
    )

    expect(result.current.data).toEqual(defaultData)
    expect(result.current.hasRestoredData).toBe(false)
    expect(result.current.timestamp).toBeNull()
  })

  it('clears restored data', () => {
    const testData = { name: 'Test', servings: 4 }
    localStorage.setItem('test-form', JSON.stringify(testData))
    localStorage.setItem('test-form__timestamp', new Date().toISOString())

    const { result } = renderHook(() =>
      useRestoreFormData('test-form', { name: '', servings: 1 })
    )

    expect(result.current.hasRestoredData).toBe(true)

    act(() => {
      result.current.clearRestored()
    })

    expect(localStorage.getItem('test-form')).toBeNull()
    expect(localStorage.getItem('test-form__timestamp')).toBeNull()
  })

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem('test-form', 'invalid json')

    const defaultData = { name: '', servings: 1 }
    const { result } = renderHook(() =>
      useRestoreFormData('test-form', defaultData)
    )

    expect(result.current.data).toEqual(defaultData)
    expect(result.current.hasRestoredData).toBe(false)
  })
})
