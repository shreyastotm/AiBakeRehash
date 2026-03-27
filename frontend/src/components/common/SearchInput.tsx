import React, { useId, useEffect, useRef, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

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
 * SearchInput — debounced search with clear button.
 * Calls onSearch after debounceMs delay (default 300ms).
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
  className,
  autoFocus = false,
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [internalValue, setInternalValue] = useState(externalValue ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (externalValue !== undefined) setInternalValue(externalValue)
  }, [externalValue])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInternalValue(val)
    onChange?.(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSearch?.(val), debounceMs)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange?.('')
    onSearch?.('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="form-label">{label}</label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-400">
          {loading
            ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            : <Search size={16} aria-hidden="true" />
          }
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
          className={cn(
            'form-input min-h-[44px] pl-10',
            internalValue && 'pr-10',
            'border-neutral-300 focus:ring-primary-500 focus:border-primary-500',
          )}
          aria-label={label ?? placeholder}
        />

        {internalValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors touch-target"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
