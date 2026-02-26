import React, { useId } from 'react'

export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface RadioGroupProps {
  name: string
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  label?: string
  error?: string
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  orientation = 'vertical',
  className = '',
}) => {
  const groupId = useId()
  const errorId = `${groupId}-error`

  return (
    <fieldset className={`w-full ${className}`}>
      {label && (
        <legend className="block text-sm font-medium text-gray-700 mb-2">{label}</legend>
      )}
      <div className={`flex ${orientation === 'horizontal' ? 'flex-row flex-wrap gap-4' : 'flex-col gap-1'}`}>
        {options.map(opt => {
          const optId = `${groupId}-${opt.value}`
          return (
            <label
              key={opt.value}
              htmlFor={optId}
              className={`flex items-start gap-3 min-h-[44px] py-1 ${opt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <input
                id={optId}
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                disabled={opt.disabled}
                onChange={() => onChange?.(opt.value)}
                aria-describedby={error ? errorId : undefined}
                className="mt-0.5 h-5 w-5 border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer flex-shrink-0"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                {opt.description && <span className="text-xs text-gray-500 mt-0.5">{opt.description}</span>}
              </span>
            </label>
          )
        })}
      </div>
      {error && <p id={errorId} role="alert" className="text-red-600 text-sm mt-1">{error}</p>}
    </fieldset>
  )
}
