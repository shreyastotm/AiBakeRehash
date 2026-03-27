import React from 'react'
import { cn } from '../../utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  label?: string
  fullScreen?: boolean
  className?: string
}

const sizeClasses = {
  sm:  'w-4 h-4 border-2',
  md:  'w-8 h-8 border-[3px]',
  lg:  'w-12 h-12 border-4',
  xl:  'w-16 h-16 border-4',
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  fullScreen = false,
  className,
}) => {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        role="status"
        aria-label={label ?? 'Loading'}
        className={cn(
          'rounded-full animate-spin',
          'border-neutral-200 border-t-primary-500',
          sizeClasses[size],
        )}
      />
      {label && (
        <span className="text-sm text-neutral-500 font-medium">{label}</span>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm z-modal">
        {spinner}
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center p-8">
      {spinner}
    </div>
  )
}
