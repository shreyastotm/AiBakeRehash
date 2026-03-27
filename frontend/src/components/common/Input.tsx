import React, { useId } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  success?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, success, leftIcon, rightIcon, id, className, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const hintId  = `${inputId}-hint`

    const borderClass = error
      ? 'border-error focus:ring-error focus:border-error'
      : success
        ? 'border-success focus:ring-success focus:border-success'
        : 'border-neutral-300 focus:ring-primary-500 focus:border-primary-500'

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'form-input min-h-[44px]',
              borderClass,
              leftIcon  && 'pl-10',
              rightIcon && 'pr-10',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            {...props}
          />
          {rightIcon && !error && !success && (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-neutral-400">
              {rightIcon}
            </div>
          )}
          {success && !error && (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <CheckCircle2 size={16} className="text-success" aria-hidden="true" />
            </div>
          )}
          {error && (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <AlertCircle size={16} className="text-error" aria-hidden="true" />
            </div>
          )}
        </div>
        {hint && !error && (
          <p id={hintId} className="form-hint">{hint}</p>
        )}
        {error && (
          <p id={errorId} role="alert" className="form-error">
            <AlertCircle size={12} aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
