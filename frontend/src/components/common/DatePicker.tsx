import React, { useId, useState, useRef, useEffect } from 'react'
import { Calendar } from 'lucide-react'

interface DatePickerProps {
  value?: string // ISO date string (YYYY-MM-DD) or DD/MM/YYYY
  onChange?: (isoDate: string, displayDate: string) => void
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  min?: string // ISO date string
  max?: string // ISO date string
  id?: string
  className?: string
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Parse DD/MM/YYYY → Date */
function parseDDMMYYYY(str: string): Date | null {
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match.map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

/** Format Date → DD/MM/YYYY */
function formatDDMMYYYY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

/** Format Date → YYYY-MM-DD (ISO) */
function toISO(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Parse ISO YYYY-MM-DD → Date */
function parseISO(str: string): Date | null {
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  return new Date(y, m - 1, d)
}

/**
 * DatePicker with DD/MM/YYYY Indian date format.
 * Supports manual text entry and optional calendar picker.
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'DD/MM/YYYY',
  error,
  hint,
  disabled = false,
  min,
  max,
  id,
  className = '',
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  // Derive initial display value from prop
  const toDisplay = (v?: string): string => {
    if (!v) return ''
    // Already DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) return v
    // ISO format
    const d = parseISO(v)
    return d ? formatDDMMYYYY(d) : ''
  }

  const [inputText, setInputText] = useState(toDisplay(value))
  const [inputError, setInputError] = useState<string | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [viewDate, setViewDate] = useState<Date>(() => {
    const d = value ? (parseISO(value) ?? parseDDMMYYYY(toDisplay(value))) : null
    return d ?? new Date()
  })

  const containerRef = useRef<HTMLDivElement>(null)

  // Sync external value
  useEffect(() => {
    setInputText(toDisplay(value))
  }, [value])

  // Close calendar on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const minDate = min ? parseISO(min) : null
  const maxDate = max ? parseISO(max) : null

  const isDisabledDate = (date: Date): boolean => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputText(raw)
    setInputError(undefined)
  }

  const handleTextBlur = () => {
    if (!inputText) {
      setInputError(undefined)
      onChange?.('', '')
      return
    }
    const parsed = parseDDMMYYYY(inputText)
    if (!parsed) {
      setInputError('Enter a valid date in DD/MM/YYYY format')
      return
    }
    if (isDisabledDate(parsed)) {
      setInputError('Date is outside the allowed range')
      return
    }
    setInputError(undefined)
    const display = formatDDMMYYYY(parsed)
    setInputText(display)
    onChange?.(toISO(parsed), display)
  }

  const handleCalendarSelect = (date: Date) => {
    if (isDisabledDate(date)) return
    const display = formatDDMMYYYY(date)
    setInputText(display)
    setInputError(undefined)
    setCalendarOpen(false)
    onChange?.(toISO(date), display)
  }

  // Build calendar grid for current viewDate month
  const buildCalendar = () => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d))
    }
    return cells
  }

  const selectedDate = parseDDMMYYYY(inputText)
  const cells = buildCalendar()
  const displayError = error ?? inputError
  const borderClass = displayError
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:ring-amber-500'

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={inputText}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? errorId : hint ? hintId : undefined}
          className={`w-full px-3 py-2.5 pr-10 border rounded-md focus:outline-none focus:ring-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${borderClass}`}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => setCalendarOpen(o => !o)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Open calendar"
          aria-expanded={calendarOpen}
        >
          <Calendar className="h-4 w-4" />
        </button>

        {calendarOpen && (
          <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3 w-72">
            {/* Month/Year navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className="text-sm font-medium text-gray-700">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} />
                const isSelected =
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear()
                const isToday =
                  date.toDateString() === new Date().toDateString()
                const isOff = isDisabledDate(date)

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={isOff}
                    onClick={() => handleCalendarSelect(date)}
                    className={`text-center text-sm py-1 rounded transition-colors ${
                      isSelected
                        ? 'bg-amber-600 text-white font-semibold'
                        : isToday
                        ? 'border border-amber-400 text-amber-700 font-medium hover:bg-amber-50'
                        : isOff
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-label={formatDDMMYYYY(date)}
                    aria-pressed={!!isSelected}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {hint && !displayError && <p id={hintId} className="text-gray-500 text-sm mt-1">{hint}</p>}
      {displayError && (
        <p id={errorId} role="alert" className="text-red-600 text-sm mt-1">{displayError}</p>
      )}
    </div>
  )
}
