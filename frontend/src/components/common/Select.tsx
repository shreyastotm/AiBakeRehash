import React, { useId, useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  label?: string
  error?: string
  hint?: string
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
  id?: string
  className?: string
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  label,
  error,
  hint,
  placeholder = 'Select an option',
  disabled = false,
  searchable = false,
  id,
  className = '',
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (opt: SelectOption) => {
    if (opt.disabled) return
    onChange?.(opt.value)
    setOpen(false)
    setSearch('')
  }

  const borderClass = error ? 'border-red-500' : 'border-gray-300'

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          id={inputId}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full px-3 py-2.5 border rounded-md text-left bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px] flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${borderClass}`}
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? selected.label : placeholder}
          </span>
          <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchable && (
              <div className="p-2 border-b">
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
            <ul role="listbox">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">No options found</li>
              ) : (
                filtered.map(opt => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === value}
                    onClick={() => handleSelect(opt)}
                    className={`px-3 py-2.5 text-sm cursor-pointer min-h-[44px] flex items-center ${
                      opt.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : opt.value === value
                        ? 'bg-amber-50 text-amber-700 font-medium'
                        : 'text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {hint && !error && <p className="text-gray-500 text-sm mt-1">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  )
}
