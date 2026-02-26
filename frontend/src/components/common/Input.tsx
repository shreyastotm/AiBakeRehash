import React, { useId } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  success?: boolean
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  success,
  id,
  className = '',
  ...props
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  const borderClass = error
    ? 'border-red-500 focus:ring-red-500'
    : success
    ? 'border-green-500 focus:ring-green-500'
    : 'border-gray-300 focus:ring-amber-500'

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 min-h-[44px] ${borderClass} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-gray-500 text-sm mt-1">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-red-600 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}
