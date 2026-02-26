import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  fullScreen?: boolean
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        role="status"
        aria-label={label ?? 'Loading'}
        className={`${sizeClasses[size]} border-gray-200 border-t-primary rounded-full animate-spin`}
      />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/70 z-50">
        {spinner}
      </div>
    )
  }

  return <div className="flex justify-center items-center p-4">{spinner}</div>
}
