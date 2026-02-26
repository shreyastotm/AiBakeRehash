import React from 'react'

interface ProgressBarProps {
  value: number // 0–100
  label?: string
  showPercent?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'error'
  className?: string
}

const COLOR_CLASSES: Record<NonNullable<ProgressBarProps['color']>, string> = {
  primary: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
}

const HEIGHT_CLASSES: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-4',
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showPercent = false,
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-gray-600">{label}</span>}
          {showPercent && <span className="text-sm text-gray-500">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${HEIGHT_CLASSES[size]}`}
      >
        <div
          className={`${HEIGHT_CLASSES[size]} ${COLOR_CLASSES[color]} rounded-full transition-all duration-300 ease-in-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
