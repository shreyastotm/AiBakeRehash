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
  /** The human-readable display label for the current value (used to restore input text without needing options to be loaded) */
  displayLabel?: string
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
  /**
   * When true, the user can type any text and confirm it as a custom value
   * by pressing Enter or blurring the input (even if it's not in the options list).
   */
  allowCustomValue?: boolean
}

/**
 * Autocomplete with keyboard navigation (arrow keys, enter, escape),
 * loading state, and accessible dropdown.
 *
 * Persistence fix: inputValue is driven by the `displayLabel` prop (or a
 * label looked up from options at selection time). It does NOT re-sync from
 * `options` on every render — only when the external `value` prop itself
 * changes — so clearing the search options after a pick doesn't wipe the text.
 */
export const Autocomplete: React.FC<AutocompleteProps> = ({
  options,
  value,
  displayLabel,
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
  allowCustomValue = false,
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

  // Track the last external `value` we synced so we only re-sync when it
  // actually changes (not when `options` changes after a pick).
  const lastSyncedValue = useRef<string | undefined>(undefined)

  // Sync display text only when the external `value` prop changes.
  // Priority: displayLabel prop > match in current options > empty.
  useEffect(() => {
    if (value === lastSyncedValue.current) return
    lastSyncedValue.current = value

    if (value === undefined || value === '') {
      setInputValue('')
      return
    }

    // Use the explicitly provided display label first
    if (displayLabel) {
      setInputValue(displayLabel)
      return
    }

    // Fall back to finding a label in the current options list
    const matched = options.find(o => o.value === value)
    if (matched) {
      setInputValue(matched.label)
    }
    // If neither is available, leave inputValue as-is (preserves typed text)
  }, [value]) // intentionally exclude `options` and `displayLabel` from deps

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
    lastSyncedValue.current = option.value // prevent next value-sync from overwriting
    setOpen(false)
    setActiveIndex(-1)
    onChange?.(option.value, option)
  }, [onChange])

  /** Commit a custom (free-text) value when allowCustomValue is enabled */
  const commitCustomValue = useCallback(() => {
    if (!allowCustomValue) return
    const trimmed = inputValue.trim()
    if (!trimmed) return
    // Don't re-fire if the user just picked from the list (value already matches)
    const alreadySelected = options.find(o => o.label === trimmed)
    if (alreadySelected) {
      handleSelect(alreadySelected)
      return
    }
    const customOption: AutocompleteOption = { value: trimmed, label: trimmed }
    lastSyncedValue.current = trimmed
    onChange?.(trimmed, customOption)
  }, [allowCustomValue, inputValue, options, handleSelect, onChange])

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
        } else if (allowCustomValue) {
          commitCustomValue()
          setOpen(false)
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
        if (allowCustomValue) commitCustomValue()
        break
    }
  }

  const handleBlur = () => {
    // Small delay so mousedown on an option fires first
    setTimeout(() => {
      if (allowCustomValue) commitCustomValue()
    }, 150)
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
          onBlur={handleBlur}
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
              <li className="px-3 py-2.5 text-sm text-gray-500">
                {allowCustomValue && inputValue.trim()
                  ? <span>Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 rounded border">Enter</kbd> to add &ldquo;{inputValue.trim()}&rdquo;</span>
                  : noOptionsText
                }
              </li>
            ) : (
              options.map((option, index) => (
                <li
                  key={`${option.value}-${index}`}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent input blur before click
                    handleSelect(option)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`px-3 py-2.5 text-sm cursor-pointer min-h-[44px] flex flex-col justify-center ${index === activeIndex
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
