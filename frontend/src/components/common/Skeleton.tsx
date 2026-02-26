import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rect' | 'circle'
  width?: string | number
  height?: string | number
  lines?: number
}

const SkeletonBase: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style,
}) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    style={style}
    aria-hidden="true"
  />
)

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  width,
  height,
  lines = 1,
}) => {
  const style: React.CSSProperties = {
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  }

  if (variant === 'circle') {
    return <SkeletonBase className={`rounded-full ${className}`} style={style} />
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2" role="status" aria-label="Loading content">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase
            key={i}
            className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'} ${className}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div role="status" aria-label="Loading content" style={style}>
      <SkeletonBase className={`w-full h-full ${className}`} />
    </div>
  )
}

export const RecipeCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-4 space-y-3" role="status" aria-label="Loading recipe">
    <Skeleton variant="rect" className="h-40 w-full rounded-md" />
    <Skeleton variant="text" lines={2} />
    <div className="flex gap-2">
      <Skeleton variant="rect" className="h-6 w-16 rounded-full" />
      <Skeleton variant="rect" className="h-6 w-16 rounded-full" />
    </div>
  </div>
)
