import React, { useEffect, useRef, useCallback } from 'react'

interface UseAutoSaveOptions {
  key: string
  interval?: number
  enabled?: boolean
}

/**
 * Hook for auto-saving form data to localStorage
 * Requirement 94.2: Implement auto-save for form data (localStorage, 30-second interval)
 * Requirement 94.6: Implement form data restoration on page reload
 */
export function useAutoSave<T extends Record<string, any>>(
  data: T,
  options: UseAutoSaveOptions
) {
  const { key, interval = 30000, enabled = true } = options
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef<string>('')

  // Save data to localStorage
  const saveData = useCallback(() => {
    try {
      const serialized = JSON.stringify(data)

      // Only save if data has changed
      if (serialized !== lastSavedRef.current) {
        localStorage.setItem(key, serialized)
        localStorage.setItem(`${key}__timestamp`, new Date().toISOString())
        lastSavedRef.current = serialized

        // Dispatch custom event for other tabs/windows
        window.dispatchEvent(
          new CustomEvent('autoSaveComplete', {
            detail: { key, timestamp: new Date().toISOString() },
          })
        )
      }
    } catch (error) {
      console.error(`Failed to auto-save data for key "${key}":`, error)
    }
  }, [data, key])

  // Setup auto-save interval
  useEffect(() => {
    if (!enabled) {
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(saveData, interval)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, interval, enabled, saveData])

  // Save on unmount
  useEffect(() => {
    return () => {
      if (enabled) {
        saveData()
      }
    }
  }, [enabled, saveData])

  return {
    saveNow: saveData,
  }
}

/**
 * Hook for restoring form data from localStorage
 * Requirement 94.6: Implement form data restoration on page reload
 */
export function useRestoreFormData<T extends Record<string, any>>(
  key: string,
  defaultValue: T
): {
  data: T
  hasRestoredData: boolean
  timestamp: string | null
  clearRestored: () => void
} {
  const [data, setData] = React.useState<T>(defaultValue)
  const [hasRestoredData, setHasRestoredData] = React.useState(false)
  const [timestamp, setTimestamp] = React.useState<string | null>(null)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(key)
      const savedTimestamp = localStorage.getItem(`${key}__timestamp`)

      if (saved) {
        const parsed = JSON.parse(saved)
        setData(parsed)
        setHasRestoredData(true)
        setTimestamp(savedTimestamp)
      }
    } catch (error) {
      console.error(`Failed to restore form data for key "${key}":`, error)
    }
  }, [key])

  const clearRestored = useCallback(() => {
    try {
      localStorage.removeItem(key)
      localStorage.removeItem(`${key}__timestamp`)
      setData(defaultValue)
      setHasRestoredData(false)
      setTimestamp(null)
    } catch (error) {
      console.error(`Failed to clear restored data for key "${key}":`, error)
    }
  }, [key, defaultValue])

  return { data, hasRestoredData, timestamp, clearRestored }
}
