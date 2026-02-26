import React, { useId, useState, useEffect, useRef } from 'react'

interface CurrencyInputProps {
  value?: number
  onChange?: (value: number | null) => void
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  min?: number
  max?: number
  id?: string
  className?: string
  name?: string
}

/** Format a number as ₹1,234.56 */
function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Strip currency formatting, return raw numeric string */
function stripFormatting(str: string): string {
  // Remove ₹, commas, spaces, and the unicode ₹ symbol variants
  return str.replace(/[₹,\s]/g, '')
}

/**
 * CurrencyInput for INR amounts.
 * - On focus: shows raw numeric value for editing
 * - On blur: formats as ₹1,234.56
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  label,
  placeholder = '₹0.00',
  error,
  hint,
  disabled = false,
  min,
  max,
  id,
  className = '',
  name,
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  const [focused, setFocused] = useState(false)
  const [rawText, setRawText] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value → display
  useEffect(() => {
    if (!focused) {
      setRawText(value != null ? String(value) : '')
    }
  }, [value, focused])

  const displayValue = (): string => {
    if (focused) return rawText
    if (rawText === '' || rawText === undefined) return ''
    const num = parseFloat(rawText)
    return isNaN(num) ? rawText : formatINR(num)
  }

  const handleFocus = () => {
    setFocused(true)
    // Show raw number on focus
    if (value != null) {
      setRawText(String(value))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = stripFormatting(e.target.value)
    // Allow digits, one decimal point, and optional minus
    if (/^-?\d*\.?\d*$/.test(stripped) || stripped === '') {
      setRawText(stripped)
    }
  }

  const handleBlur = () => {
    setFocused(false)
    if (rawText === '' || rawText === '-') {
      onChange?.(null)
      setRawText('')
      return
    }
    const num = parseFloat(rawText)
    if (isNaN(num)) {
      onChange?.(null)
      setRawText('')
      return
    }
    // Clamp to min/max
    const clamped = min != null && num < min ? min : max != null && num > max ? max : num
    const rounded = Math.round(clamped * 100) / 100
    onChange?.(rounded)
    setRawText(String(rounded))
  }

  const borderClass = error
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:ring-amber-500'

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {/* ₹ prefix indicator when not focused and empty */}
        {!focused && !rawText && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 text-sm">₹</span>
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          value={displayValue()}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-label={label ?? 'Currency amount in INR'}
          className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${
            !focused && !rawText ? 'pl-7' : ''
          } ${borderClass}`}
        />
      </div>

      {hint && !error && <p id={hintId} className="text-gray-500 text-sm mt-1">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  )
}
