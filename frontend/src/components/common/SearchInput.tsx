import React, { useId, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  debounceMs?: number
  disabled?: boolean
  loading?: boolean
  label?: string
  id?: string
  className?: string
  autoFocus?: boolean
}

/**
 * SearchInput with 300ms debounce, search icon, and clear button.
 * Calls onSearch after the debounce delay.
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value: externalValue,
  onChange,
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
  disabled = false,
  loading = false,
  label,
  id,
  className = '',
  autoFocus = false,
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId

  // Support both controlled and uncontrolled usage
  const [internalValue, setInternalValue] = useState(externalValue ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value changes
  useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue)
    }
  }, [externalValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange?.(newValue)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onSearch?.(newValue)
    }, debounceMs)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange?.('')
    onSearch?.('')
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Search icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <svg
              className="animate-spin h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          )}
        </div>

        <input
          id={inputId}
          type="search"
          value={internalValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={label ?? placeholder}
        />

        {/* Clear button */}
        {internalValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
