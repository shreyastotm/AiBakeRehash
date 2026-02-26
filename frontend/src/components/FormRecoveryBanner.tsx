import React from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Button } from './common/Button'

interface FormRecoveryBannerProps {
  timestamp: string | null
  onRestore: () => void
  onDiscard: () => void
}

/**
 * Banner component showing recovered form data
 * Requirement 94.2: Implement auto-save for form data
 * Requirement 94.6: Implement form data restoration on page reload
 */
export const FormRecoveryBanner: React.FC<FormRecoveryBannerProps> = ({
  timestamp,
  onRestore,
  onDiscard,
}) => {
  const [isVisible, setIsVisible] = React.useState(true)

  if (!timestamp || !isVisible) {
    return null
  }

  const recoveryTime = new Date(timestamp)
  const timeAgo = getTimeAgo(recoveryTime)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">
            Recovered form data
          </h3>
          <p className="text-sm text-blue-800 mt-1">
            We found your unsaved changes from {timeAgo}. Would you like to restore them?
          </p>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={onRestore}
              size="sm"
              variant="secondary"
            >
              Restore
            </Button>
            <Button
              onClick={() => {
                onDiscard()
                setIsVisible(false)
              }}
              size="sm"
              variant="ghost"
            >
              Discard
            </Button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 text-blue-600 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Helper function to format time difference
 */
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString()
}
