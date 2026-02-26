import React from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Button } from './Button'

export interface ErrorMessageProps {
  title?: string
  message: string
  details?: string
  onDismiss?: () => void
  onRetry?: () => void
  isRetrying?: boolean
  variant?: 'error' | 'warning' | 'info'
}

/**
 * User-friendly error message component
 * Requirement 94.1: Create user-friendly error messages
 * Requirement 94.5: Implement manual retry buttons for failed operations
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message,
  details,
  onDismiss,
  onRetry,
  isRetrying = false,
  variant = 'error',
}) => {
  const variantStyles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-600',
      title: 'text-red-900',
      message: 'text-red-800',
      details: 'text-red-700',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-900',
      message: 'text-yellow-800',
      details: 'text-yellow-700',
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      message: 'text-blue-800',
      details: 'text-blue-700',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className={`border rounded-lg p-4 ${styles.container}`}>
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className={`w-5 h-5 ${styles.icon}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${styles.title}`}>{title}</h3>
          <p className={`text-sm mt-1 ${styles.message}`}>{message}</p>

          {details && (
            <details className="mt-2">
              <summary className={`text-xs cursor-pointer font-medium ${styles.message}`}>
                Show details
              </summary>
              <pre className={`text-xs mt-2 p-2 bg-white rounded overflow-auto max-h-40 ${styles.details}`}>
                {details}
              </pre>
            </details>
          )}

          {/* Actions */}
          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isRetrying}
                  size="sm"
                  variant="secondary"
                >
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              )}
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  size="sm"
                  variant="ghost"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ${styles.icon} hover:opacity-70 transition-opacity`}
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
