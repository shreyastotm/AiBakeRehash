import React, { useId, useRef, useState, useEffect, useCallback } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'

export interface AutocompleteOption {
  value: string
  label: string
  sublabel?: string
}

interface AutocompleteProps {
  options: AutocompleteOption[]
  value?: string
  onChange?: (value: string, option: AutocompleteOption) => void
  onInputChange?: (inputValue: string) => void
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  loading?: boolean
  disabled?: boolean
  id?: string
  className?: string
  noOptionsText?: string
}

/**
 * Autocomplete with keyboard navigation (arrow keys, enter, escape),
 * loading state, and accessible dropdown.
 */
export const Autocomplete: React.FC<AutocompleteProps> = ({
  options,
  value,
  onChange,
  onInputChange,
  label,
  placeholder = 'Type to search...',
  error,
  hint,
  loading = false,
  disabled = false,
  id,
  className = '',
  noOptionsText = 'No options found',
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listboxId = `${inputId}-listbox`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync display value when external value changes
  useEffect(() => {
    if (value !== undefined) {
      const matched = options.find(o => o.value === value)
      setInputValue(matched ? matched.label : '')
    }
  }, [value, options])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    setOpen(true)
    setActiveIndex(-1)
    onInputChange?.(val)
  }

  const handleSelect = useCallback((option: AutocompleteOption) => {
    setInputValue(option.label)
    setOpen(false)
    setActiveIndex(-1)
    onChange?.(option.value, option)
  }, [onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && options[activeIndex]) {
          handleSelect(options[activeIndex])
        }
        break
      case 'Escape':
        setOpen(false)
        setActiveIndex(-1)
        inputRef.current?.blur()
        break
      case 'Tab':
        setOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  const borderClass = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          autoComplete="off"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (options.length > 0) setOpen(true) }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2.5 pr-10 border rounded-md focus:outline-none focus:ring-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${borderClass}`}
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          )}
        </div>

        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label ?? placeholder}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {loading ? (
              <li className="px-3 py-2.5 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-gray-500">{noOptionsText}</li>
            ) : (
              options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent input blur before click
                    handleSelect(option)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`px-3 py-2.5 text-sm cursor-pointer min-h-[44px] flex flex-col justify-center ${
                    index === activeIndex
                      ? 'bg-amber-50 text-amber-700'
                      : option.value === value
                      ? 'bg-amber-50 text-amber-700 font-medium'
                      : 'text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{option.label}</span>
                  {option.sublabel && (
                    <span className="text-xs text-gray-500 mt-0.5">{option.sublabel}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {hint && !error && <p id={hintId} className="text-gray-500 text-sm mt-1">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  )
}
