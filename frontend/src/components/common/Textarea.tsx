import React, { useId, useRef, useEffect } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  autoResize?: boolean
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  autoResize = true,
  id,
  className = '',
  onChange,
  ...props
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = ref.current
    if (!el || !autoResize) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => { resize() }, [props.value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    resize()
    onChange?.(e)
  }

  const borderClass = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={3}
        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 resize-none overflow-hidden min-h-[44px] ${borderClass} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onChange={handleChange}
        {...props}
      />
      {hint && !error && <p className="text-gray-500 text-sm mt-1">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  )
}
