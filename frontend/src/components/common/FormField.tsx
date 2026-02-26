import React, { useId } from 'react'
import { useFormContext, RegisterOptions, FieldValues, Path } from 'react-hook-form'
import { ErrorMessage } from './ErrorMessage'

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  hint?: string
  required?: boolean
  rules?: RegisterOptions<T>
  children: (props: {
    id: string
    name: Path<T>
    error?: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }) => React.ReactNode
  className?: string
}

/**
 * FormField wraps any input with a label and error display.
 * Must be used inside a <Form> component.
 */
export function FormField<T extends FieldValues>({
  name,
  label,
  hint,
  required,
  rules,
  children,
  className = '',
}: FormFieldProps<T>) {
  const generatedId = useId()
  const fieldId = `field-${generatedId}`
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  const {
    register,
    formState: { errors },
  } = useFormContext<T>()

  // Register the field with any provided rules
  if (rules) {
    register(name, rules)
  }

  const error = errors[name]?.message as string | undefined
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}

      {children({
        id: fieldId,
        name,
        error,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
      })}

      {hint && !error && (
        <p id={hintId} className="text-gray-500 text-sm mt-1">{hint}</p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-red-600 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

// Simpler variant for direct use with Input/Textarea/Select
interface SimpleFormFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

export const SimpleFormField: React.FC<SimpleFormFieldProps> = ({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
  className = '',
}) => {
  const generatedId = useId()
  const fieldId = htmlFor ?? generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}

      {children}

      {hint && !error && (
        <p id={hintId} className="text-gray-500 text-sm mt-1">{hint}</p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-red-600 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  )
}
