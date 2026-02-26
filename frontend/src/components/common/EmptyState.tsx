import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const DefaultIcon: React.FC = () => (
  <svg
    className="w-12 h-12 text-gray-300"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    role="status"
  >
    <div className="mb-4">{icon ?? <DefaultIcon />}</div>
    <h3 className="text-lg font-medium text-gray-700 mb-1">{title}</h3>
    {description && <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {action.label}
      </button>
    )}
  </div>
)
