import React, { useId } from 'react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
  description?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  description,
  id,
  className = '',
  ...props
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className={`w-full ${className}`}>
      {/* min 44x44 touch target via padding */}
      <label
        htmlFor={inputId}
        className="flex items-start gap-3 cursor-pointer min-h-[44px] py-1"
      >
        <input
          id={inputId}
          type="checkbox"
          className="mt-0.5 h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer flex-shrink-0"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {description && <span className="text-xs text-gray-500 mt-0.5">{description}</span>}
        </span>
      </label>
      {error && <p id={errorId} role="alert" className="text-red-600 text-sm mt-1 ml-8">{error}</p>}
    </div>
  )
}
